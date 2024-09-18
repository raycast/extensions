// swift-tools-version:5.4
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "recognize-text",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [],
    targets: [
        .executableTarget(name: "recognize-text", dependencies: []),
    ]
)
