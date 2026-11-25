// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "DisplayHelper",
    platforms: [.macOS(.v12)],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", exact: "1.0.4")
    ],
    targets: [
        .executableTarget(
            name: "DisplayHelper",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools")
            ]
        )
    ],
    swiftLanguageModes: [.v5]
)
