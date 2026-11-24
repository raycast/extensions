import AppKit
import LogoLightCore

struct Request: Decodable {
    enum Operation: String, Decodable {
        case status, toggle, brightness, effect, battery, charging, lid, morse, stopMorse, login, takeOver, quit
    }

    var operation: Operation
    var level: Int?
    var effect: String?
    var enabled: Bool?
    var text: String?
    var loops: Bool?
}

struct Snapshot: Encodable {
    var supported: Bool
    var originalRunning: Bool
    var setting: String?
    var glow: Int
    var direct: Bool
    var soundAvailable: Bool
    var lidAvailable: Bool
    var brightness: Int
    var chosenBrightness: Int
    var effect: String
    var battery: Bool
    var charging: Bool
    var chargingNow: Bool
    var lid: Bool
    var lidKeepsMacAwake: Bool
    var morse: String?
    var morseLoops: Bool
    var lastMorse: String
    var login: Bool
    var soundError: String?
}

struct Reply: Encodable {
    var state: Snapshot?
    var error: String?
}

struct CommandError: LocalizedError {
    let errorDescription: String?
    init(_ message: String) { errorDescription = message }
}

@MainActor
final class LidLightService {
    private let controller = LogoController.live()
    private let reader = LogoStatusReader()
    private let defaults = UserDefaults.standard
    private let blocker = LidSleepBlocker()
    private lazy var loan = LoanWatcher(controller: controller)
    private var active = false
    private var busy = false
    private var yielding = false
    private var stopping = false
    private var lastDisplayAwake: Bool?
    private var batteryObserver: BatteryObserver?
    private var lidObserver: LidObserver?
    private var observers: [NSObjectProtocol] = []
    private var mappingTimer: Timer?
    private var soundError: String?
    private let frameNudge = FrameNudge()

    private static var originalApps: [NSRunningApplication] {
        NSRunningApplication.runningApplications(withBundleIdentifier: "app.logolight.LogoLight")
            .filter { !$0.isTerminated }
    }

    private var savedBrightness: Double { defaults.object(forKey: "Brightness") as? Double ?? 1 }
    private var savedEffect: LogoEffect { defaults.string(forKey: "Effect").flatMap(LogoEffect.init(rawValue:)) ?? .none }

    func start() {
        guard !active, Self.originalApps.isEmpty, controller.status().isSupported else { return }
        active = true
        controller.onSoundFailed = { [weak self] error in
            self?.defaults.set(LogoEffect.none.rawValue, forKey: "Effect")
            self?.soundError = "Allow Lid Light Helper under System Audio Recording Only in System Settings, then choose Sound again. " + error.localizedDescription
        }
        controller.onRiseFromDark = { [weak self] in self?.frameNudge.show() }
        loan.check()
        controller.start(
            brightness: savedBrightness,
            effect: savedEffect,
            followsBattery: defaults.bool(forKey: "Battery"),
            lightsWithLidClosed: defaults.bool(forKey: "Lid"),
            breathesWhileCharging: defaults.bool(forKey: "Charging")
        )
        loan.start()
        observeDisplay()
        lidObserver = LidObserver { [weak self] in self?.screenChanged() }
        batteryObserver = BatteryObserver { [weak self] in
            self?.controller.batteryDidChange()
            self?.updateSleepBlocker()
        }
        let timer = Timer(timeInterval: 10, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.controller.keepBrightnessUntied()
                self?.updateSleepBlocker()
            }
        }
        timer.tolerance = 2
        RunLoop.main.add(timer, forMode: .common)
        mappingTimer = timer
        updateSleepBlocker()
    }

    func observeOriginal() {
        observers.append(NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didLaunchApplicationNotification, object: nil, queue: .main
        ) { [weak self] notice in
            guard (notice.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication)?
                .bundleIdentifier == "app.logolight.LogoLight" else { return }
            MainActor.assumeIsolated {
                guard let self, self.active else { return }
                self.yielding = true
                NSApp.terminate(nil)
            }
        })
    }

    func stop() {
        guard active else { return }
        blocker.set(false)
        loan.stop()
        if !yielding, Self.originalApps.isEmpty { controller.restoreNormalLighting() }
    }

    func reply(to data: Data) async -> Data {
        let reply: Reply
        do {
            let request = try JSONDecoder().decode(Request.self, from: data)
            reply = Reply(state: try await perform(request))
        } catch {
            reply = Reply(error: error.localizedDescription)
        }
        return (try? JSONEncoder().encode(reply)) ?? Data()
    }

    private func perform(_ request: Request) async throws -> Snapshot {
        guard !stopping else { throw CommandError("The Lid Light helper is stopping.") }
        switch request.operation {
        case .quit:
            if busy { throw CommandError("Wait for the current change to finish before stopping the helper.") }
            stopping = true
            // Give the connection time to send its reply.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { NSApp.terminate(nil) }
            return snapshot()
        case .status:
            start()
            return snapshot()
        default: break
        }

        guard !busy else { throw CommandError("A lid light change is already in progress.") }
        busy = true
        defer { busy = false }

        if request.operation == .takeOver {
            let apps = Self.originalApps
            for app in apps { _ = app.terminate() }
            for _ in 0..<40 where !Self.originalApps.isEmpty {
                try await Task.sleep(for: .milliseconds(100))
            }
        }
        guard Self.originalApps.isEmpty else {
            throw CommandError("Quit LogoLight before changing the lid light in Raycast.")
        }

        start()
        guard active else { throw LogoLightError.unsupportedMac }
        let needsDirect: Bool
        switch request.operation {
        case .brightness, .effect, .battery, .charging, .lid, .morse, .stopMorse: needsDirect = true
        default: needsDirect = false
        }
        if needsDirect, !controller.canControlDirectly {
            throw CommandError("Direct logo control is unavailable on this version of macOS.")
        }

        switch request.operation {
        case .toggle:
            _ = try await controller.toggle()
        case .brightness:
            guard let level = request.level, (0...100).contains(level) else {
                throw CommandError("Enter a whole number between 0 and 100.")
            }
            let brightness = Double(level) / 100
            controller.setBrightness(brightness)
            defaults.set(brightness, forKey: "Brightness")
        case .effect:
            guard let raw = request.effect, let effect = LogoEffect(rawValue: raw) else {
                throw CommandError("Choose an available effect.")
            }
            if effect == .sound, !controller.canFollowSound {
                throw CommandError("Sound requires macOS 14.2 or later.")
            }
            soundError = nil
            defaults.set(effect.rawValue, forKey: "Effect")
            controller.setEffect(effect)
        case .battery:
            let enabled = request.enabled ?? !controller.followsBattery
            controller.setFollowsBattery(enabled)
            defaults.set(enabled, forKey: "Battery")
        case .charging:
            let enabled = request.enabled ?? !controller.breathesWhileCharging
            controller.setBreathesWhileCharging(enabled)
            defaults.set(enabled, forKey: "Charging")
        case .lid:
            guard controller.canLightWithLidClosed else { throw CommandError("Lid state is unavailable.") }
            let enabled = request.enabled ?? !controller.lightsWithLidClosed
            controller.setLightsWithLidClosed(enabled)
            defaults.set(enabled, forKey: "Lid")
        case .morse:
            let text = (request.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            guard text.count <= MorseCode.maxLength, MorseCode.canSend(text) else {
                throw CommandError("Enter up to 120 characters with letters, numbers, or Morse punctuation.")
            }
            let loops = request.loops ?? false
            guard controller.playMorse(text, loops: loops) else {
                throw CommandError("Turn the logo on and wake the display before playing Morse code.")
            }
            defaults.set(text, forKey: "MorseText")
            defaults.set(loops, forKey: "MorseLoops")
        case .stopMorse:
            controller.stopMorse()
        case .login:
            try LaunchAtLogin.setEnabled(request.enabled ?? !LaunchAtLogin.isEnabled)
        case .status, .takeOver, .quit:
            break
        }

        updateSleepBlocker()
        return snapshot()
    }

    private func snapshot() -> Snapshot {
        let status = controller.status()
        return Snapshot(
            supported: status.isSupported, originalRunning: !Self.originalApps.isEmpty,
            setting: status.setting?.rawValue, glow: percent(controller.liveGlow),
            direct: controller.canControlDirectly, soundAvailable: controller.canFollowSound,
            lidAvailable: controller.canLightWithLidClosed, brightness: percent(controller.brightness),
            chosenBrightness: percent(savedBrightness), effect: controller.effect.rawValue,
            battery: controller.followsBattery, charging: controller.breathesWhileCharging,
            chargingNow: controller.isCharging || controller.isAwaitingCharge, lid: controller.lightsWithLidClosed,
            lidKeepsMacAwake: blocker.isHolding, morse: controller.morse?.text,
            morseLoops: controller.morse?.loops ?? defaults.bool(forKey: "MorseLoops"),
            lastMorse: defaults.string(forKey: "MorseText") ?? "SOS",
            login: LaunchAtLogin.isEnabled, soundError: soundError
        )
    }

    private func percent(_ level: Double) -> Int { Int((level * 100).rounded()) }

    private func updateSleepBlocker() {
        blocker.set(active && controller.lightsWithLidClosed && controller.canLightWithLidClosed
            && controller.status().setting == .on && Battery.powerState()?.isPluggedIn == true)
    }

    private func observeDisplay() {
        lastDisplayAwake = reader.isDisplayAwake()
        let workspace = NSWorkspace.shared.notificationCenter
        for name in [NSWorkspace.screensDidSleepNotification, NSWorkspace.willSleepNotification] {
            observers.append(workspace.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated {
                    guard let self else { return }
                    self.controller.displayDidSleep()
                    self.lastDisplayAwake = false
                    if name == NSWorkspace.screensDidSleepNotification, self.blocker.isHolding,
                       self.reader.isLidClosed() == true, self.reader.hasExternalDisplay() == false {
                        self.scheduleWake()
                    }
                }
            })
        }
        for name in [NSWorkspace.screensDidWakeNotification, NSWorkspace.didWakeNotification] {
            observers.append(workspace.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.scheduleWake() }
            })
        }
        observers.append(NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.screenChanged() }
        })
    }

    private func screenChanged() {
        guard let awake = reader.isDisplayAwake(), let previous = lastDisplayAwake, awake != previous else { return }
        lastDisplayAwake = awake
        if !awake {
            controller.displayDidSleep()
            scheduleWake()
        } else if controller.animator?.isPlaying != true {
            scheduleWake()
        }
    }

    private func scheduleWake() {
        controller.scheduleWake(after: 1) { [weak self] in
            guard let self else { return }
            self.lastDisplayAwake = self.reader.isDisplayAwake()
            self.updateSleepBlocker()
        }
    }
}

/// CoreBrightness can wait for a display frame before relighting the LED. Request one using
/// a one-point, nearly transparent window that doesn't take focus or accept input.
@MainActor
private final class FrameNudge {
    private var window: NSWindow?

    func show() {
        guard let screen = NSScreen.screens.first else { return }
        if window == nil {
            let window = NSWindow(contentRect: NSRect(x: screen.frame.minX, y: screen.frame.minY, width: 1, height: 1),
                                  styleMask: [.borderless], backing: .buffered, defer: false)
            window.level = .statusBar
            window.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
            window.ignoresMouseEvents = true
            window.sharingType = .none
            window.isOpaque = false
            window.backgroundColor = .white
            window.alphaValue = 0.004
            window.orderFrontRegardless()
            self.window = window
        }
        if let window { window.alphaValue = window.alphaValue == 0.004 ? 0.008 : 0.004 }
    }
}
