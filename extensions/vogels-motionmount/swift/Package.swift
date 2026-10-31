// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "VogelsMotionMount",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0"),
    ],
    targets: [
        .target(name: "MotionMountKit"),
        .executableTarget(
            name: "VogelsMotionMount",
            dependencies: [
                "MotionMountKit",
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
        .testTarget(name: "MotionMountKitTests", dependencies: ["MotionMountKit"]),
    ]
)
