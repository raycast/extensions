// swift-tools-version:5.2
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "bclm",
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "0.1.0")
    ],
    targets: [
        .target(
            name: "bclm",
            dependencies: [
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ]),
        .testTarget(
            name: "bclmTests",
            dependencies: ["bclm"]),
    ]
)
