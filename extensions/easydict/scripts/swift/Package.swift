// swift-tools-version:5.4

import PackageDescription

let package = Package(
    name: "recognizeText",
    platforms: [
        .macOS(.v10_15)
    ],
    dependencies: [],
    targets: [
        .executableTarget(name: "recognizeText", dependencies: [], path: "."),
    ]
)
