// swift-tools-version: 5.10
// =============================================================================
// SIDECAR SWIFT PACKAGE
// Executable target compiled by `ray build` via extensions-swift-tools.
// -----------------------------------------------------------------------------
// NOTE: The @raycast functions in Sources/Sidecar are exported to TypeScript by
//   the Raycast SPM plugins; no binary is committed and no swiftc is run by hand.
// =============================================================================

import PackageDescription

let package = Package(
  name: "Sidecar",
  platforms: [.macOS(.v12)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4"),
  ],
  targets: [
    .executableTarget(
      name: "Sidecar",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    ),
  ]
)
