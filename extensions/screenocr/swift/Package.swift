// swift-tools-version: 6.3

import PackageDescription

let package = Package(
    name: "ScreenOCR",
    platforms: [.macOS("15.0")],
    dependencies: [
      .package(url: "https://github.com/raycast/extensions-swift-tools.git", from: "1.1.0")
    ],
    targets: [
      .executableTarget(
        name: "ScreenOCR",
        dependencies: [
          .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
          .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
          .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools")
        ]
      )
    ]
)
