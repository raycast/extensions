import AVFoundation
import Foundation

guard CommandLine.arguments.count >= 3 else {
    fputs("Usage: looper <file> <volume 0.0-1.0>\n", stderr)
    exit(1)
}

let filePath = CommandLine.arguments[1]
let volume = Float(CommandLine.arguments[2]) ?? 1.0
let url = URL(fileURLWithPath: filePath)

guard let player = try? AVAudioPlayer(contentsOf: url) else {
    fputs("Cannot open: \(filePath)\n", stderr)
    exit(1)
}

player.numberOfLoops = -1
player.volume = volume
player.play()

signal(SIGTERM, { _ in exit(0) })
signal(SIGINT, { _ in exit(0) })
RunLoop.current.run()
