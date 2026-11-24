import AppKit

if let index = CommandLine.arguments.firstIndex(of: LidSleep.guardArgument),
   CommandLine.arguments.indices.contains(index + 1), let pid = pid_t(CommandLine.arguments[index + 1]) {
    LidSleep.runGuard(for: pid)
}

@MainActor
final class HelperDelegate: NSObject, NSApplicationDelegate {
    private var server: LocalServer?
    private var service: LidLightService?

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            let service = LidLightService()
            server = try LocalServer(directory: "/tmp/raycast-lid-light-\(getuid())") { [service] data in
                await service.reply(to: data)
            }
            self.service = service
            service.observeOriginal()
            service.start()
        } catch {
            NSLog("Lid Light helper couldn't start: %@", error.localizedDescription)
            NSApp.terminate(nil)
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        service?.stop()
    }
}

let app = NSApplication.shared
let delegate = HelperDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)

let signalSources = [SIGTERM, SIGINT, SIGHUP].map { number in
    signal(number, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: number, queue: .main)
    source.setEventHandler { MainActor.assumeIsolated { NSApp.terminate(nil) } }
    source.resume()
    return source
}

app.run()
