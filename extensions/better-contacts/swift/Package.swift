// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "contacts-helper",
    platforms: [.macOS(.v12)],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "contacts-helper",
            dependencies: [],
            path: "Sources"
        )
    ]
)
