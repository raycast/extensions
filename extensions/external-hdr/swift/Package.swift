// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "ExternalHDR",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0"),
  ],
  targets: [
    .target(
      name: "HDRCore",
      path: "Sources/HDRCore",
      publicHeadersPath: "include",
      linkerSettings: [
        .unsafeFlags(["-F/System/Library/PrivateFrameworks"]),
        .linkedFramework("MonitorPanel"),
      ]
    ),
    .executableTarget(
      name: "ExternalHDR",
      dependencies: [
        "HDRCore",
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ],
      path: "Sources/ExternalHDR"
    ),
  ]
)
