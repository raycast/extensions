// swift-tools-version:5.9

import PackageDescription

let package = Package(
    name: "auth",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [],
    targets: [
        .executableTarget(name: "auth", dependencies: []),
    ]
)