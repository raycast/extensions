// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "DiskSpeedHelper",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(name: "DiskSpeedCore", targets: ["DiskSpeedCore"])
    ],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
    ],
    targets: [
        .target(name: "DiskSpeedCore"),
        .executableTarget(
            name: "DiskSpeedHelper",
            dependencies: [
                "DiskSpeedCore",
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            path: "Sources/DiskSpeedAPI"
        ),
        .testTarget(name: "DiskSpeedCoreTests", dependencies: ["DiskSpeedCore"])
    ]
)
