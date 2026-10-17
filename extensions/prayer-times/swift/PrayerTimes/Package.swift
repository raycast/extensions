// swift-tools-version: 5.9

import PackageDescription

// Built by Raycast's Swift bridge (`swift:` imports in src/lib/helper.ts) into
// assets/compiled_raycast_swift/PrayerTimes. Locally without Xcode, see README → Development.
let package = Package(
  name: "PrayerTimes",
  platforms: [
    .macOS(.v13)
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.5")
  ],
  targets: [
    .executableTarget(
      name: "PrayerTimes",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    )
  ]
)
