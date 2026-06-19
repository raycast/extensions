import Foundation

func sendSignal(_ signal: String, to processName: String) {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/killall")
    process.arguments = [signal, processName]
    process.standardError = Pipe()
    try? process.run()
    process.waitUntilExit()
}

func killProcess(_ name: String) {
    sendSignal("-TERM", to: name)
}
