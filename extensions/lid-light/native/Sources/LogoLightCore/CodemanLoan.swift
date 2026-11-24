import Darwin
import Foundation

/// Lending the logo to Codeman (getcodeman.com), a manager for AI coding agents. Its Mac app shows
/// what the agents are doing on this logo: it breathes while they work, blinks when one is waiting
/// for you and flashes when one needs a permission. It moves the logo the way LogoLight does, through
/// `DisplayLogicalState` fades, so the two apps would fight over every fade. So while Codeman blinks
/// the logo, LogoLight steps aside: it pauses its effect, writes nothing to the logo, and takes it back
/// once Codeman is done (`LogoController.lend()`, `takeBack()`, watched by `LoanWatcher`).
///
/// The contract, which the Codeman app keeps to (`packages/desktop/src/logo.rs` in
/// github.com/Ark0N/Codeman):
/// - Right before it first moves the logo, Codeman's blinker writes its process ID, in decimal, to
///   `~/Library/Application Support/Codeman/logo-fade`. It removes the file once the logo is back to
///   normal. A blinker that was killed leaves the file behind, and Codeman puts the logo back at its
///   next launch.
/// - So the logo is lent while that file names a running process called `codeman-desktop`. An empty
///   file (left by a Codeman that predates this contract), a process that has ended, or one by
///   another name means it isn't.
/// - The `LogoLightStepsAsideForCodeman` key in LogoLight's Info.plist tells Codeman that this
///   LogoLight steps aside. Codeman reads it from the running app's bundle. Without it, Codeman
///   leaves the logo to LogoLight, as it always has. With it, Codeman waits a moment after writing
///   the file before its first fade (longer than `LoanWatcher.interval`), so LogoLight has paused by
///   then.
public enum CodemanLoan {
    /// The name of Codeman's process (its blinker is the same binary).
    static let processName = "codeman-desktop"

    /// Where Codeman's blinker writes its process ID while it moves the logo.
    public static var markerURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent("Codeman", isDirectory: true)
            .appendingPathComponent("logo-fade")
    }

    /// The process ID in the marker's text, if it holds one.
    static func processID(in text: String) -> pid_t? {
        guard let pid = pid_t(text.trimmingCharacters(in: .whitespacesAndNewlines)), pid > 0 else { return nil }
        return pid
    }

    /// Whether `pid` is a running Codeman process.
    public static func isCodeman(_ pid: pid_t) -> Bool {
        var name = [CChar](repeating: 0, count: 64)
        let length = proc_name(pid, &name, UInt32(name.count))
        guard length > 0 else { return false }
        return String(decoding: name.prefix(Int(length)).map { UInt8(bitPattern: $0) }, as: UTF8.self) == processName
    }

    /// The Codeman process the logo is lent to, if it is: the one the marker at `url` names, while it
    /// runs. Only the start of the file is read; the ID is a few characters.
    public static func borrower(markerAt url: URL?, isCodeman: (pid_t) -> Bool = isCodeman) -> pid_t? {
        guard let url, let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        guard let data = try? handle.read(upToCount: 32), let text = String(data: data, encoding: .utf8),
              let pid = processID(in: text), isCodeman(pid) else { return nil }
        return pid
    }
}

/// Lends the logo to Codeman while it blinks it, and takes it back after (see `CodemanLoan`). It looks
/// every `interval` seconds. The logo goes back only once it has been free for `returnDelay`: between
/// one blink and the next (when an agent goes from working to waiting for you, say) Codeman puts the
/// logo back to normal for a moment, and LogoLight starting its own effect in that moment would only
/// flash it.
@MainActor
public final class LoanWatcher {
    /// How often it looks. Codeman waits longer than this after writing its marker before it first
    /// moves the logo.
    public static let interval = 1.0
    /// How long the logo has to be free before it's taken back.
    public static let returnDelay = 1.5

    private let controller: LogoController
    private let borrower: @MainActor () -> pid_t?
    private let clock: @MainActor () -> Double
    /// When the logo was first seen free while lent, or `nil`.
    private var freeSince: Double?
    private var timer: Timer?

    /// Called after the logo was lent or taken back, e.g. to update the menu.
    public var onChange: (@MainActor () -> Void)?

    /// `borrower` answers the process the logo is lent to now (by default, from Codeman's marker), and
    /// `clock` the time in seconds.
    public init(controller: LogoController,
                borrower: @escaping @MainActor () -> pid_t? = { CodemanLoan.borrower(markerAt: CodemanLoan.markerURL) },
                clock: @escaping @MainActor () -> Double = LightEmitter.uptime) {
        self.controller = controller
        self.borrower = borrower
        self.clock = clock
    }

    /// Looks once. At launch, call it before `LogoController.start(...)`, so a logo Codeman is
    /// blinking isn't touched, then `start()`.
    public func check() {
        if borrower() != nil {
            freeSince = nil
            guard !controller.isLent else { return }
            controller.lend()
            onChange?()
            return
        }
        guard controller.isLent else { return }
        let now = clock()
        guard let since = freeSince else {
            freeSince = now
            return
        }
        guard now - since >= Self.returnDelay else { return }
        freeSince = nil
        controller.takeBack()
        onChange?()
    }

    /// Looks every `interval` seconds from now on, in the menu's event-tracking mode too.
    public func start() {
        timer?.invalidate()
        let timer = Timer(timeInterval: Self.interval, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.check() }
        }
        timer.tolerance = 0.25
        RunLoop.main.add(timer, forMode: .common)
        self.timer = timer
    }

    public func stop() {
        timer?.invalidate()
        timer = nil
    }
}
