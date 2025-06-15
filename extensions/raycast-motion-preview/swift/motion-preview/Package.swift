// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "motion-preview",
  platforms: [
    .macOS(.v12),
  ],
  dependencies: [
      .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4")
  ],
  targets: [
    .executableTarget(
      name: "motion-preview",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ],
      path: "src"
    ),
  ]
)
