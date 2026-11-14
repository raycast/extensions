// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "AppleTranslate",
    platforms: [.macOS("26.4")],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
    ],
    targets: [
        .executableTarget(
            name: "AppleTranslate",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools")
            ]
        )
    ],
    swiftLanguageModes: [.v5]
)
