// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "KeyraycastHelper",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "KeyraycastHelper",
            path: "Sources"
        ),
    ]
)
