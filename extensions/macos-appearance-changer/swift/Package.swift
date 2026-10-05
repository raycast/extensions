// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "AppearanceManager",
    platforms: [.macOS("26.0")],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4"),
    ],
    targets: [
        .executableTarget(
            name: "AppearanceManager",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            path: "Sources"
        ),
    ]
)
