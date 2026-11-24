import Foundation

/// Where the display's own brightness mapping is kept while LogoLight's flat one replaces it (see
/// `LogoController.untieBrightnessFromDisplay()`), so a run that doesn't quit cleanly can't lose it.
@MainActor
public protocol MappingStore: AnyObject {
    var mapping: [[Double]]? { get set }
}

/// The app's preferences.
@MainActor
public final class DefaultsMappingStore: MappingStore {
    private static let key = "DisplayBrightnessMapping"
    public init() {}
    public var mapping: [[Double]]? {
        get { UserDefaults.standard.array(forKey: Self.key) as? [[Double]] }
        set { UserDefaults.standard.set(newValue, forKey: Self.key) }
    }
}

/// Reads and changes the illuminated logo setting, sets its brightness, and plays effects.
///
/// It controls the logo through `corebrightnessd` directly when it can (no password, smooth
/// fades, brightness, effects), and otherwise falls back to Apple's documented `defaults`
/// command as root.
@MainActor
public final class LogoController {
    private let reader: LogoStatusReader
    private let emitter: LightEmitter?
    private let admin: AdminShell
    private let sudo: PasswordlessSudo
    private let isRuleInstalled: @MainActor () -> Bool
    private let verificationTimeout: Duration
    private let sleep: LogoAnimator.Sleep
    private let readBatteryCharge: @MainActor () -> Double?
    private let readPowerState: @MainActor () -> Battery.PowerState?
    private let mappingStore: MappingStore
    /// Writes the display's brightness back as it is, so corebrightnessd takes a mapping at once
    /// (`DisplayBrightness.rewrite()`).
    private let rewriteDisplayBrightness: @MainActor () -> Bool
    /// For waits that aren't animation (how long charging may take to start after a plug-in). Unlike
    /// `sleep`, whose fake in the tests moves the logo's clock, tests end these by hand.
    private let wait: LogoAnimator.Sleep
    /// The setting this process last applied, for when the hardware can't show it.
    private var lastApplied: LogoIllumination?
    /// The setting as of the last `status()` or switch, so the live view needn't read it every frame.
    private var knownSetting: LogoIllumination?
    /// The switch's fade in progress, so the display sleeping can cut it short.
    private var switchFadeTask: Task<Void, Error>?
    /// A wake waiting to be handled (see `scheduleWake(after:then:)`).
    private var pendingWake: Task<Void, Never>?
    /// The brightness chosen with the slider. While the brightness follows the battery, it's kept
    /// for when that's turned off.
    private var chosenBrightness = 1.0
    /// The battery's charge when it was last read, from 0 to 1. `nil` until a read has worked.
    private var batteryCharge: Double?

    /// Plays effects and holds the brightness. `nil` when the logo can't be controlled directly.
    public let animator: LogoAnimator?

    /// How long the logo fades when it's switched on or off directly. 0 switches instantly.
    public var switchFadeDuration: Double = 1.0

    /// Whether the first password dialog also installs the password-free rule (fallback path only).
    /// The dialog then says so, and later switches use `sudo` without asking. Removing the rule
    /// (`disablePasswordless()`) turns this off, so it isn't installed again, and installing it
    /// turns it back on; the app saves that choice. It also goes off when the install didn't work,
    /// so later dialogs don't promise it again.
    public var autoEnablesPasswordless = false

    /// Awaited just before a password dialog is shown while switching. The dialog blocks the app
    /// until it's answered, so the app closes its menu here, which would otherwise sit frozen under
    /// it. Not called when `sudo` makes the switch without a dialog.
    public var willPromptForPassword: (@MainActor () async -> Void)?

    /// Whether the logo is being switched on or off (`set(_:)` is running, one at a time).
    /// Meanwhile, choosing an effect or a brightness only records it, and a wake doesn't restart
    /// anything: the switch applies the latest choices when it's done.
    public private(set) var isSwitching = false

    public init(
        reader: LogoStatusReader,
        emitter: LightEmitter?,
        admin: AdminShell,
        sudo: PasswordlessSudo,
        isRuleInstalled: @escaping @MainActor () -> Bool,
        verificationTimeout: Duration = .seconds(3),
        // A small tolerance: by default, sleeps can run tens of ms late, which shows in effects.
        sleep: @escaping LogoAnimator.Sleep = { try await Task.sleep(for: .seconds($0), tolerance: .milliseconds(2)) },
        batteryCharge: @escaping @MainActor () -> Double? = Battery.charge,
        powerState: @escaping @MainActor () -> Battery.PowerState? = Battery.powerState,
        wait: @escaping LogoAnimator.Sleep = { try await Task.sleep(for: .seconds($0)) },
        soundSource: SoundLevelSource? = nil,
        mappingStore: MappingStore = DefaultsMappingStore(),
        rewriteDisplayBrightness: @escaping @MainActor () -> Bool = DisplayBrightness.rewrite
    ) {
        self.reader = reader
        self.emitter = emitter
        self.admin = admin
        self.sudo = sudo
        self.isRuleInstalled = isRuleInstalled
        self.verificationTimeout = verificationTimeout
        self.sleep = sleep
        readBatteryCharge = batteryCharge
        readPowerState = powerState
        self.wait = wait
        self.mappingStore = mappingStore
        self.rewriteDisplayBrightness = rewriteDisplayBrightness
        animator = emitter.map { emitter in
            LogoAnimator(emitter: emitter, isDisplayAwake: { Self.canLight(reader: reader, emitter: emitter) },
                         sleep: sleep, soundSource: soundSource)
        }
    }

    /// The controller for this Mac's real hardware. `batteryCharge` and `powerState` can stand in for
    /// the battery (`tools/livecheck` steps them), and `soundSource` for the sound the Mac plays (by
    /// default, the system's audio, where macOS lets it be heard).
    public static func live(batteryCharge: @escaping @MainActor () -> Double? = Battery.charge,
                            powerState: @escaping @MainActor () -> Battery.PowerState? = Battery.powerState,
                            soundSource: SoundLevelSource? = SystemSound.source()) -> LogoController {
        LogoController(
            reader: LogoStatusReader(),
            emitter: CoreBrightnessService().map { LightEmitter(service: $0, clock: LightEmitter.uptime) },
            admin: AppleScriptAdminShell(),
            sudo: SudoRunner(),
            isRuleInstalled: { PasswordlessRule.isInstalled },
            batteryCharge: batteryCharge,
            powerState: powerState,
            soundSource: soundSource
        )
    }

    /// Called as the logo starts to rise from dark, so the app can have the display show a new frame
    /// (see `LightEmitter.onRiseFromDark`).
    public var onRiseFromDark: (@MainActor () -> Void)? {
        get { emitter?.onRiseFromDark }
        set { emitter?.onRiseFromDark = newValue }
    }

    /// Whether the logo can be controlled without a password (and brightness and effects are available).
    public var canControlDirectly: Bool { emitter != nil }

    public func status() -> LogoStatus {
        var status = reader.read()
        guard status.isSupported else { return status }
        if let setting = emitter?.setting {
            status.setting = setting
            status.source = .daemon
        } else if status.source != .led, let lastApplied {
            // When the LED can't tell us (screen off, lid closed), the NVRAM copy may be out of
            // date, but a setting we applied ourselves is known to be current.
            status.setting = lastApplied
            status.source = .lastApplied
        }
        knownSetting = status.setting
        return status
    }

    public var isPasswordlessEnabled: Bool { isRuleInstalled() }

    /// Turns the logo on or off, and waits until the hardware reflects it.
    @discardableResult
    public func set(_ target: LogoIllumination) async throws -> LogoStatus {
        guard status().isSupported else { throw LogoLightError.unsupportedMac }
        isSwitching = true
        defer { isSwitching = false }

        if let emitter {
            let outcome = try await setDirectly(target, emitter: emitter)
            if outcome != .notApplied {
                didApply(target, atChosenLevel: outcome == .appliedAtLevel)
                return status()
            }
            // corebrightnessd didn't take the change; fall back to the documented command.
        }

        do {
            try await runAsRoot(target)
        } catch where target == .on && CoreBrightnessSetting.isMissingKeyError(error) {
            // Nothing to delete: the setting is already at its default (on).
        }
        lastApplied = target // so a status read while the screen is off shows it
        // At the end, so a choice made while waiting is applied too.
        defer { didApply(target, atChosenLevel: false) }
        return try await waitForSetting(target)
    }

    /// After the setting has changed: starts the chosen effect or brightness, unless the logo is
    /// already held at that brightness.
    private func didApply(_ target: LogoIllumination, atChosenLevel: Bool) {
        lastApplied = target
        if target == .on, !atChosenLevel, isDisplayAwake { animator?.resume() }
    }

    /// Flips the current setting.
    @discardableResult
    public func toggle() async throws -> LogoStatus {
        let current = status()
        guard current.isSupported else { throw LogoLightError.unsupportedMac }
        return try await set((current.setting ?? .on).toggled)
    }

    // MARK: - Effects and brightness

    /// The chosen effect.
    public var effect: LogoEffect { animator?.effect ?? .none }

    /// Chooses an effect, and plays it now if the logo is on and the display is awake.
    /// Choosing `.none` returns the logo to the chosen brightness. While the logo breathes for the
    /// battery charging (`breathesWhileCharging`), it carries on, and the new effect plays once that
    /// stops.
    public func setEffect(_ effect: LogoEffect) {
        guard let animator else { return }
        let wasSendingMorse = animator.morse != nil
        animator.select(effect)
        animator.stopMorse() // the effect takes over from a Morse message
        guard !isSwitching else { return }
        // Restarting would only break the breathing's rhythm.
        if animator.standInEffect != nil, animator.isPlaying, !wasSendingMorse { return }
        if isLitAndAwake { animator.resume() } else { animator.pause() }
    }

    /// Whether the Sound effect can be offered: the logo is controlled directly and the sound can be
    /// heard (macOS 14.2 or later).
    public var canFollowSound: Bool { animator?.canFollowSound ?? false }

    /// Called when the Sound effect couldn't start, e.g. without permission to hear the sound (see
    /// `SoundError`). The effect is `.none` again by then; the app should save that and say why.
    public var onSoundFailed: (@MainActor (Error) -> Void)? {
        get { animator?.onSoundFailed }
        set { animator?.onSoundFailed = newValue }
    }

    // MARK: - Morse code

    /// The Morse message being sent, if any.
    public var morse: MorseMessage? { animator?.morse }

    /// Sends `text` in Morse, once or (`loops`) until `stopMorse()` or an effect is chosen. It needs the
    /// logo on and the display awake, as effects do; a loop resumes after a wake or the logo being turned
    /// back on, but a message sent once is dropped when it's interrupted. Returns whether it started.
    @discardableResult
    public func playMorse(_ text: String, loops: Bool) -> Bool {
        guard let animator, !isSwitching, isLitAndAwake else { return false }
        return animator.startMorse(MorseMessage(text: text, loops: loops))
    }

    /// Switches the loop of the Morse message being sent, without restarting it: on, it carries on
    /// until it's stopped; off, it ends after this pass.
    public func setMorseLoops(_ loops: Bool) {
        animator?.setMorseLoops(loops)
    }

    /// Stops a Morse message, going back to the chosen effect or brightness.
    public func stopMorse() {
        guard let animator, animator.morse != nil else { return }
        animator.stopMorse()
        if !isSwitching, isLitAndAwake { animator.resume() } else { animator.pause() }
    }

    /// Called when a Morse message ends by itself (sent once and done, or interrupted).
    public var onMorseEnded: (@MainActor () -> Void)? {
        get { animator?.onMorseEnded }
        set { animator?.onMorseEnded = newValue }
    }

    /// How bright the logo is (or how bright effects peak), from 0 (dimmest) to 1 (normal): the
    /// brightness chosen with `setBrightness(_:)`, or the battery's charge while it's followed.
    public var brightness: Double { animator?.brightness ?? 1 }

    /// Chooses the brightness. While the battery is followed, it's kept for when that's turned off.
    public func setBrightness(_ brightness: Double) {
        chosenBrightness = min(max(brightness, 0), 1)
        if !followsBattery { apply(chosenBrightness) }
    }

    /// Whether the brightness follows the battery's charge, as a battery indicator: normal when it's
    /// full, and dimmer as it runs down. Effects peak at it too.
    public private(set) var followsBattery = false

    /// Turns the battery indicator on or off. Off, the logo goes back to the chosen brightness.
    public func setFollowsBattery(_ follows: Bool) {
        guard follows != followsBattery else { return }
        followsBattery = follows
        if follows { readBattery() }
        apply(currentBrightness)
    }

    /// Call when the battery's charge, or whether it's charging, may have changed. While the charge is
    /// followed, it's read again, and a new charge is applied; a charge that can't be read leaves the
    /// brightness as it is. With `breathesWhileCharging`, a plug-in or charging starting starts the
    /// breathing, and unplugging or charging stopping stops it.
    public func batteryDidChange() {
        if followsBattery {
            let last = batteryCharge
            readBattery()
            if batteryCharge != last { apply(currentBrightness) }
        }
        if breathesWhileCharging {
            readCharging()
            if updateStandIn() { activeEffectDidChange() }
        }
    }

    /// The brightness to show: the battery's charge while it's followed (the chosen brightness if it
    /// hasn't been read), otherwise the chosen one.
    private var currentBrightness: Double {
        followsBattery ? batteryCharge ?? chosenBrightness : chosenBrightness
    }

    private func readBattery() {
        if let charge = readBatteryCharge() { batteryCharge = charge }
    }

    // MARK: - Charging light

    /// Whether the logo breathes while the battery charges, like the old MacBook sleep light: Breathe
    /// plays in place of the chosen effect, peaking at the brightness, until charging stops (the Mac is
    /// unplugged, or the battery is full or held at a charge limit). The chosen effect then comes back.
    /// It starts as soon as the Mac is plugged in with the battery not full (`isAwaitingCharge`), since
    /// macOS takes a while to say it's charging. It needs the logo on and the display awake, as effects
    /// do: nothing can light the logo while the Mac sleeps.
    public private(set) var breathesWhileCharging = false

    /// Whether the battery was charging when it was last read. It's only read while
    /// `breathesWhileCharging` is on.
    public private(set) var isCharging = false

    /// Whether the Mac was plugged in less than `chargingStartWait` ago, with the battery not full, and
    /// macOS doesn't say it's charging yet. The logo breathes meanwhile. Charging starting, unplugging and a
    /// full battery end it, and so does the wait running out: the battery is then held at a limit.
    public private(set) var isAwaitingCharge = false

    /// How long the logo breathes after a plug-in before macOS says the battery is charging. On the
    /// MacBook Pro it said "AC attached; not charging" for about a minute first (2026-11-09).
    public static let chargingStartWait = 120.0

    /// Whether the Mac was plugged in when the power was last read: `nil` before the first read (at
    /// launch, or when the switch is turned on), so only a plug-in that's seen starts `isAwaitingCharge`.
    private var wasPluggedIn: Bool?
    private var chargeWait: Task<Void, Never>?

    /// Turns the charging light on or off. If the battery is charging, the logo starts breathing, or goes
    /// back to the chosen effect or brightness.
    public func setBreathesWhileCharging(_ breathes: Bool) {
        guard breathes != breathesWhileCharging else { return }
        breathesWhileCharging = breathes
        if breathes {
            readCharging()
        } else {
            endChargeWait()
            wasPluggedIn = nil
        }
        if updateStandIn() { activeEffectDidChange() }
    }

    /// Reads whether the Mac is plugged in and charging. A plug-in with the battery not full starts
    /// `isAwaitingCharge`. A state that can't be read leaves the last one.
    private func readCharging() {
        guard let power = readPowerState() else { return }
        isCharging = power.isCharging
        if !power.isPluggedIn || power.isFull || power.isCharging {
            endChargeWait()
        } else if wasPluggedIn == false {
            awaitCharge()
        }
        wasPluggedIn = power.isPluggedIn
    }

    /// Breathes until charging starts, for up to `chargingStartWait`, then goes by whether it has.
    private func awaitCharge() {
        chargeWait?.cancel()
        isAwaitingCharge = true
        chargeWait = Task { [weak self, wait] in
            do { try await wait(Self.chargingStartWait) } catch { return }
            guard let self, !Task.isCancelled else { return }
            chargeWait = nil
            isAwaitingCharge = false
            readCharging()
            if updateStandIn() { activeEffectDidChange() }
        }
    }

    private func endChargeWait() {
        chargeWait?.cancel()
        chargeWait = nil
        isAwaitingCharge = false
    }

    /// Has Breathe stand in for the chosen effect while the battery charges, or clears it. Returns whether
    /// that changed the effect that plays: not when Breathe is chosen anyway.
    @discardableResult
    private func updateStandIn() -> Bool {
        guard let animator else { return false }
        let before = animator.activeEffect
        animator.standInEffect = breathesWhileCharging && (isCharging || isAwaitingCharge) ? .breathe : nil
        return animator.activeEffect != before
    }

    /// Shows a new active effect at once if the logo is lit. A Morse message carries on, and the new
    /// effect follows it; a switch under way applies it when it's done.
    private func activeEffectDidChange() {
        guard let animator, animator.morse == nil, !isSwitching, isLitAndAwake else { return }
        animator.resume()
    }

    /// The effect that plays when the logo is lit: the chosen one, or Breathe while the battery charges.
    private var activeEffect: LogoEffect { animator?.activeEffect ?? .none }

    /// Fades to a new brightness if the logo is lit, or keeps it for when it is. A playing effect picks
    /// it up at its next step.
    private func apply(_ brightness: Double) {
        guard let animator else { return }
        animator.brightness = brightness
        if !isSwitching, isLitAndAwake { animator.brightnessDidChange() }
    }

    // MARK: - The display's brightness

    /// Whether this run has untied the logo's brightness from the display's
    /// (`untieBrightnessFromDisplay()`), so it ties it back when it quits.
    public private(set) var isUntiedFromDisplay = false

    /// Unties the logo's brightness from the display's: corebrightnessd normally maps the display's nits
    /// to the logo's (`LEPWMBrightnessNitsMapping`), so the logo dims with the display; this writes a flat
    /// mapping, so only the brightness chosen here and the ambient light set it (see docs/corebrightnessd.md,
    /// "Keeping the brightness off the display's"). corebrightnessd takes a mapping at the next change of
    /// the display's nits, so the display's brightness is then written back as it is, which makes it take
    /// it at once; with the display asleep or the logo lent, it's taken at the next change. The mapping it
    /// replaces is saved (`mappingStore`), so it can be put back even after a run that didn't quit
    /// cleanly, which leaves the flat one. `start` calls this.
    ///
    /// Until the mapping is taken, the logo still dims with the display. The level isn't raised to make
    /// up for that: corebrightnessd raises `AppliedNits` the moment it takes the mapping, before a look
    /// could notice, and a raised level then flashed to 2.6 times its light for half a second.
    public func untieBrightnessFromDisplay() {
        guard let emitter, let current = emitter.brightnessMapping else { return }
        if !LightEmitter.isFlat(current) {
            mappingStore.mapping = current
            if emitter.setBrightnessMapping(LightEmitter.flatMapping) { applyMapping() }
        }
        isUntiedFromDisplay = true
    }

    /// Ties the logo's brightness to the display's again, as macOS has it: writes back the mapping that
    /// `untieBrightnessFromDisplay()` replaced (macOS's own if that's lost), and has corebrightnessd take
    /// it at once. Only a flat mapping, the one this app writes, is replaced. `restoreNormalLighting()`
    /// calls this.
    private func tieBrightnessToDisplay() {
        isUntiedFromDisplay = false
        guard let emitter, let current = emitter.brightnessMapping, LightEmitter.isFlat(current) else { return }
        if emitter.setBrightnessMapping(mappingStore.mapping ?? LightEmitter.defaultMapping) { applyMapping() }
    }

    /// Has corebrightnessd take the mapping just written, by writing the display's brightness back as it
    /// is, unless the display is asleep (or the logo lent): it's taken at the next change then.
    private func applyMapping() {
        guard isDisplayAwake else { return }
        _ = rewriteDisplayBrightness()
    }

    /// Writes the flat mapping again if corebrightnessd has gone back to its own (e.g. it restarted). Call
    /// now and then: the app does every 10 s, and a wake does too.
    public func keepBrightnessUntied() {
        guard isUntiedFromDisplay, let emitter, let current = emitter.brightnessMapping,
              !LightEmitter.isFlat(current)
        else { return }
        untieBrightnessFromDisplay()
    }

    /// How brightly the logo is glowing at this moment, from 0 (dark) to 1 (fully lit), for a live
    /// view. The fade level is read from the hardware on every call, so it follows effects and
    /// changes made elsewhere. The on/off setting comes from the last `status()` (refresh it now
    /// and then), or is read when that isn't known yet. It's scaled about like the brightness
    /// slider rather than in raw light output.
    public var liveGlow: Double {
        guard let emitter else { return status().isLit == true ? 1 : 0 }
        if knownSetting == nil { knownSetting = emitter.setting }
        guard knownSetting == .on, let level = emitter.fadeLevel else { return 0 }
        return min(max(level, 0), 1).squareRoot()
    }

    /// Call when the display or the Mac goes to sleep.
    public func displayDidSleep() {
        pendingWake?.cancel()
        pendingWake = nil
        animator?.pause()
        switchFadeTask?.cancel()
        // Codeman, which has the logo, does the same for its own fades.
        guard !isLent else { return }
        // So corebrightnessd's own fades (when the display sleeps and wakes) work normally,
        // instead of using a brightness hold's endless duration.
        emitter?.setFadeDuration(0)
        // A fade just before the display slept may have told the keyboard it was still on.
        emitter?.displayDidChange(isAwake: false)
    }

    /// Handles a wake after `delay` seconds (using the injected sleep). Another call before then restarts the
    /// wait, and `displayDidSleep()` cancels it. `completion` runs after a wake is handled.
    ///
    /// A system wake posts more than one notification, and corebrightnessd relights the logo
    /// itself first, so the wake is handled once, a moment later.
    public func scheduleWake(after delay: Double, then completion: @escaping @MainActor () -> Void) {
        pendingWake?.cancel()
        pendingWake = Task { [weak self, sleep] in
            do { try await sleep(delay) } catch { return }
            guard let self, !Task.isCancelled else { return }
            pendingWake = nil
            displayDidWake()
            completion()
        }
    }

    /// Call when the display wakes up, to handle it straight away. With the lid closed, the logo is
    /// first told the lid is open (`lightsWithLidClosed`) or left dark, every time: corebrightnessd
    /// may have sent the lid state again while it slept, and leaves a held level lit by itself.
    public func displayDidWake() {
        updateLidOverride()
        keepBrightnessUntied()
        guard isDisplayAwake else { return }
        emitter?.displayDidChange(isAwake: true)
        // The charge may have changed while the Mac slept, with no notification since. The resume
        // fades to it.
        if followsBattery {
            readBattery()
            animator?.brightness = currentBrightness
        }
        // Likewise the Mac may have been plugged in or unplugged.
        if breathesWhileCharging {
            readCharging()
            updateStandIn()
        }
        if !isSwitching, status().setting == .on { animator?.resume() }
    }

    /// Returns the logo to normal (fully lit), e.g. before quitting or after an effect was
    /// interrupted by a crash. The chosen effect and brightness are kept. With the lid closed,
    /// normal is dark, so a logo lit by `lightsWithLidClosed` goes dark. Its brightness is tied to the
    /// display's again (`untieBrightnessFromDisplay()`).
    public func restoreNormalLighting() {
        // Handing it back first releases a held level, so the lid state then darkens it. A logo lent
        // to Codeman is left to it: Codeman returns it to normal when it's done.
        if isLent { animator?.pause() } else { animator?.reset() }
        emitter?.endLidOverride()
        tieBrightnessToDisplay()
    }

    // MARK: - Lending the logo

    /// Whether the logo is lent to Codeman, which blinks it while its agents work (see
    /// `CodemanLoan`). Meanwhile nothing here writes to the logo: an effect is paused, and choosing
    /// an effect or a brightness only records it, as while the display sleeps. Switching the logo
    /// on or off still changes the setting, without the fade; off, Codeman sees it and stops.
    public private(set) var isLent = false

    /// Lends the logo: pauses the effect and stops writing to the logo, leaving it as it is.
    public func lend() {
        guard !isLent else { return }
        isLent = true
        pendingWake?.cancel()
        pendingWake = nil
        animator?.pause()
        switchFadeTask?.cancel()
    }

    /// Takes the logo back, as after a wake: the effect or brightness chosen comes back, also one
    /// chosen meanwhile. Codeman has left the logo lit at normal brightness, heading for lit, but
    /// that's not known here, so it's handled like any change made elsewhere.
    public func takeBack() {
        guard isLent else { return }
        isLent = false
        displayDidWake()
    }

    // MARK: - The lid

    /// Whether the logo stays lit while the lid is closed: with an external display attached, or
    /// with none while the Mac is awake all the same (the app keeps it awake on power).
    /// corebrightnessd darkens it then, so it's told the lid is open, and the keyboard that it's
    /// closed (see `LightEmitter.overrideLid()`). Effects and the brightness carry on as with the
    /// lid open. The light sensor is covered, though, so the logo glows as in a dark room.
    public private(set) var lightsWithLidClosed = false

    /// Whether `lightsWithLidClosed` can work: the logo is controlled directly, and corebrightnessd
    /// says where the lid is. Read once, as the menu asks on every refresh.
    public private(set) lazy var canLightWithLidClosed: Bool = emitter?.isLidClosed != nil

    /// Turns `lightsWithLidClosed` on or off. With the lid closed, the logo lights, as after a wake,
    /// or goes dark, as when the lid closes.
    public func setLightsWithLidClosed(_ lights: Bool) {
        guard lights != lightsWithLidClosed else { return }
        lightsWithLidClosed = lights
        guard emitter?.isLidClosed == true else { return }
        if lights {
            displayDidWake()
        } else {
            displayDidSleep()
            darkenForClosedLid()
        }
    }

    /// With the lid closed, tells the logo the lid is open if `lightsWithLidClosed`, and otherwise
    /// leaves it dark. Once the lid has really opened, there's nothing to end.
    private func updateLidOverride() {
        guard let emitter else { return }
        switch emitter.isLidClosed {
        case true?: if lightsWithLidClosed { emitter.overrideLid() } else { darkenForClosedLid() }
        case false?: emitter.lidDidOpen()
        case nil: break
        }
    }

    /// Leaves the logo dark for the closed lid, as corebrightnessd has it normally, and ends any
    /// override (also one a run that didn't quit cleanly left). The daemon doesn't darken a logo
    /// held at a level when it's told the lid is closed: a hold heading for dark already isn't a
    /// change, and one heading for lit gets a fade at the hold's endless duration. So a lit logo is
    /// told the lid is open, handed back to normal at the automatic fade duration, and then told
    /// it's closed, which fades it out.
    private func darkenForClosedLid() {
        guard let emitter else { return }
        if (emitter.fadeLevel ?? 0) > 0.001 {
            animator?.pause()
            if !emitter.isLidOverridden { emitter.overrideLid() }
            emitter.restore(displayAwake: true)
        }
        emitter.endLidOverride()
    }

    /// Applies the saved choices at launch, after anything a previous run left behind, and unties the
    /// logo's brightness from the display's (`untieBrightnessFromDisplay()`).
    ///
    /// A previous run that didn't quit cleanly may have left the logo held at a level, with the
    /// endless fade duration. If the logo is on and a level or an effect is chosen, it goes
    /// straight there: the fades' own writes replace that duration, without first relighting to
    /// full. Otherwise it's returned to normal, which ends that duration too. With `followsBattery`,
    /// the level is the battery's charge, and `brightness` is kept for when that's turned off. With
    /// `breathesWhileCharging` and the battery charging, Breathe plays in place of `effect`.
    public func start(brightness: Double?, effect: LogoEffect, followsBattery: Bool = false,
                      lightsWithLidClosed: Bool = false, breathesWhileCharging: Bool = false) {
        guard let animator else { return }
        self.lightsWithLidClosed = lightsWithLidClosed
        updateLidOverride()
        untieBrightnessFromDisplay()
        if let brightness { chosenBrightness = min(max(brightness, 0), 1) }
        self.followsBattery = followsBattery
        if followsBattery { readBattery() }
        animator.brightness = currentBrightness
        animator.select(effect)
        self.breathesWhileCharging = breathesWhileCharging
        if breathesWhileCharging { readCharging() }
        updateStandIn()
        if isLitAndAwake, animator.level < 1 || activeEffect != .none {
            animator.resume()
        } else if !isLent {
            animator.reset()
        }
    }

    // MARK: - Password-free rule (only used when direct control isn't available)

    /// Installs the sudoers rule so toggling no longer asks for a password. Once that has worked,
    /// `autoEnablesPasswordless` is back on. A cancelled dialog leaves it as it was, and an install
    /// that fails turns it off for this session, so the next password dialog doesn't promise the rule.
    public func enablePasswordless() async throws {
        let rule = try PasswordlessRule()
        do {
            try admin.run(
                script: rule.installScript,
                prompt: "LogoLight wants to let you turn the Apple logo on and off without entering your password."
            )
        } catch {
            if (error as? LogoLightError) != .cancelled { autoEnablesPasswordless = false }
            throw error
        }
        guard await sudo.canRun(CoreBrightnessSetting.command(for: .off)) else {
            throw LogoLightError.passwordlessRuleNotHonored
        }
        autoEnablesPasswordless = true
    }

    /// Removes the sudoers rule. Once it's gone, `autoEnablesPasswordless` is off, so the next
    /// password doesn't install it again.
    public func disablePasswordless() throws {
        try admin.run(
            script: PasswordlessRule.removeScript,
            prompt: "LogoLight wants to require your password again for turning the Apple logo on and off."
        )
        autoEnablesPasswordless = false
    }

    // MARK: - Private

    /// Whether the logo can light for this app: the built-in display is on, or the lid is closed with
    /// the logo told otherwise (`lightsWithLidClosed`) and either an external display on or none
    /// connected (the Mac is then awake only because something keeps it awake, as the app does on
    /// power), and the logo isn't lent to Codeman (`isLent`). Every path that starts an effect or a
    /// fade checks this.
    private var isDisplayAwake: Bool { !isLent && Self.canLight(reader: reader, emitter: emitter) }

    private static func canLight(reader: LogoStatusReader, emitter: LightEmitter?) -> Bool {
        if reader.isDisplayAwake() == true { return true }
        guard emitter?.isLidOverridden == true else { return false }
        return reader.isExternalDisplayAwake() == true || reader.hasExternalDisplay() == false
    }

    private var isLitAndAwake: Bool { isDisplayAwake && status().setting == .on }

    /// What `setDirectly` did.
    private enum SwitchOutcome {
        /// corebrightnessd didn't take the change.
        case notApplied
        /// The setting changed. The chosen effect or brightness still needs starting.
        case applied
        /// The setting changed, and the logo is at the chosen brightness, with no effect chosen.
        case appliedAtLevel
    }

    /// Switches through `corebrightnessd`, fading if the display is on.
    ///
    /// The display can sleep or wake during a fade, so it's checked again after each one.
    private func setDirectly(_ target: LogoIllumination, emitter: LightEmitter) async throws -> SwitchOutcome {
        animator?.pause()
        // Lent to Codeman: only the setting changes, with no fade and no other write (this app's idea
        // of where the logo is heading is out of date). Off, Codeman sees it and stops; on, the effect
        // comes back with the logo.
        if isLent {
            let applied = emitter.setSetting(target) && emitter.setting == target
            if applied { knownSetting = target }
            return applied ? .applied : .notApplied
        }
        // Like the animator, hold off App Nap, so the fades stop on time.
        let activity = ProcessInfo.processInfo.beginActivity(
            options: .userInitiatedAllowingIdleSystemSleep, reason: "Switching the Apple logo on or off")
        defer { ProcessInfo.processInfo.endActivity(activity) }
        let fade = isDisplayAwake ? switchFadeDuration : 0

        if target == .off {
            if fade > 0 { await switchFade(to: 0, over: fade, emitter: emitter) }
            let applied = emitter.setSetting(.off) && emitter.setting == .off
            if applied { knownSetting = .off }
            // Back to normal. While the setting is off, relighting has no visible effect.
            emitter.restore(displayAwake: isDisplayAwake)
            return applied ? .applied : .notApplied
        }

        // Start from dark, so turning on doesn't flash before the fade begins.
        if fade > 0 { await switchFade(to: 0, over: 0.05, emitter: emitter) }
        guard emitter.setSetting(.on), emitter.setting == .on else {
            emitter.restore(displayAwake: isDisplayAwake)
            return .notApplied
        }
        knownSetting = .on // so the live view shows the fade in
        if fade > 0, isDisplayAwake {
            // An effect or a Morse loop takes over from dark, starting with a rising step.
            if activeEffect != .none || morse != nil { return .applied }
            let level = animator?.level ?? 1
            await switchFade(to: level, over: fade, emitter: emitter)
            if isDisplayAwake {
                // Below full it's now held at the level; at full it goes back to normal.
                if level >= 1 { emitter.restore(displayAwake: true) }
                // An effect or brightness chosen during the fade still needs applying.
                return activeEffect == .none && morse == nil && animator?.level == level ? .appliedAtLevel : .applied
            }
        }
        emitter.restore(displayAwake: isDisplayAwake)
        return .applied
    }

    /// One of the switch's fades. `displayDidSleep()` cancels it, so it stops without a hold,
    /// which would relight the keyboard and bring back the endless fade duration.
    private func switchFade(to level: Double, over duration: Double, emitter: LightEmitter) async {
        let task = Task { [sleep] in try await emitter.fade(to: level, over: duration, sleep: sleep) }
        switchFadeTask = task
        _ = await task.result
        switchFadeTask = nil
    }

    /// Runs the documented command for `target` as root: through `sudo` if the password-free rule is
    /// installed, otherwise through the password dialog.
    private func runAsRoot(_ target: LogoIllumination) async throws {
        let command = CoreBrightnessSetting.command(for: target)
        if isRuleInstalled() {
            do {
                try await sudo.run(command)
                return
            } catch where CoreBrightnessSetting.isMissingKeyError(error) {
                throw error
            } catch {
                // The rule is missing or out of date; fall back to the password dialog.
            }
        } else if autoEnablesPasswordless, let rule = try? PasswordlessRule() {
            // The same dialog installs the rule, so this is the last time a password is needed. The
            // command's result is the script's, and a failed install doesn't stop it.
            await willPromptForPassword?()
            do {
                try admin.run(script: rule.installScript(thenRunning: command),
                              prompt: Self.prompt(for: target, enablingPasswordless: true))
            } catch {
                // A cancelled dialog ran nothing, and the next one offers the rule again.
                if (error as? LogoLightError) != .cancelled { await stopAutoEnablingUnlessRuleWorks(for: command) }
                throw error
            }
            await stopAutoEnablingUnlessRuleWorks(for: command)
            return
        }
        await willPromptForPassword?()
        try admin.run(script: command.shellString, prompt: Self.prompt(for: target))
    }

    /// After a dialog that also installed the rule: if the rule isn't there (e.g. a managed Mac refused
    /// it) or `sudo` doesn't honor it, later dialogs only run the command, rather than promising again
    /// what they can't do. For this session only: it isn't the user's choice, so the app doesn't save it.
    private func stopAutoEnablingUnlessRuleWorks(for command: PrivilegedCommand) async {
        let works = isRuleInstalled() ? await sudo.canRun(command) : false
        if !works { autoEnablesPasswordless = false }
    }

    /// Waits for the hardware to follow the new setting, when it can be observed.
    private func waitForSetting(_ target: LogoIllumination) async throws -> LogoStatus {
        let deadline = ContinuousClock.now + verificationTimeout
        while true {
            let current = status()
            if ![.led, .daemon].contains(current.source) || current.setting == target { return current }
            if ContinuousClock.now >= deadline { throw LogoLightError.notApplied(expected: target) }
            try await Task.sleep(for: .milliseconds(100))
        }
    }

    static func prompt(for target: LogoIllumination, enablingPasswordless: Bool = false) -> String {
        let action = switch target {
        case .off: "LogoLight wants to turn off the illuminated Apple logo."
        case .on: "LogoLight wants to turn the illuminated Apple logo back on."
        }
        guard enablingPasswordless else { return action }
        return action + " After this, you can turn it on and off without your password "
            + "(change this with Disable Password in LogoLight's menu)."
    }
}
