// swift-tools-version: 6.0
// Native side of Simple GIF Cap. Raycast's build compiles this package and
// exposes every @raycast function to TypeScript (import from "swift:../swift").
import PackageDescription

let package = Package(
  name: "GifCapHelper",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
  ],
  targets: [
    .executableTarget(
      name: "GifCapHelper",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ],
      swiftSettings: [.swiftLanguageMode(.v5)]
    )
  ]
)
