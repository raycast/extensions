// swift-tools-version: 5.8
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "DocumentSearcher",
    platforms: [
        .macOS(.v11)
    ],
    targets: [
        .executableTarget(name: "SearchDocument"),
        .executableTarget(name: "DrawImage"),
        .executableTarget(name: "GetOutline")
    ]
)
