// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SpeakPlayer",
    platforms: [.macOS(.v13)],
    targets: [
        .target(name: "CVoice", exclude: ["vendor/LICENSE"]),
        .executableTarget(name: "SpeakPlayer", dependencies: ["CVoice"])
    ]
)
