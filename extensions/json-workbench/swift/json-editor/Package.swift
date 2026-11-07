// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "json-editor",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", exact: "1.1.0")
    ],
    targets: [
        .executableTarget(
            name: "json-editor",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools")
            ],
            plugins: [.plugin(name: "BuildEditor")]
        ),
        .plugin(name: "BuildEditor", capability: .buildTool())
    ],
    swiftLanguageModes: [.v5]
)
