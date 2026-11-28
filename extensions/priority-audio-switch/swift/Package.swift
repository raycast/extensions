// swift-tools-version: 6.0
// Core Audio access for Priority Audio Switch. `ray build` / `ray develop` compile this package because
// src/audio-device.ts imports it with `swift:../swift`; the functions marked @raycast become TypeScript functions.
import PackageDescription

let package = Package(
    name: "AudioControl",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0"),
    ],
    targets: [
        .executableTarget(
            name: "AudioControl",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ]
        ),
    ]
)
