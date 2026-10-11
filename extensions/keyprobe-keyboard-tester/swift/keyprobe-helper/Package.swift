// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "KeyProbeHelper",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "KeyProbeHelper",
            path: "Sources"
        )
    ]
)
