// swift-tools-version: 6.0

import PackageDescription

// Native helper for the Raycast extension. Built by `ray build` via raycast/extensions-swift-tools,
// which generates the TypeScript bindings imported as `swift:../../swift` (see src/lib/macos.ts).
// Requires Xcode 16.3+. See docs/DECISIONS.md ADR-008.
let package = Package(
  name: "JumperNative",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
  ],
  targets: [
    .executableTarget(
      name: "JumperNative",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    )
  ]
)
