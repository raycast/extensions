// swift-tools-version: 5.6

import PackageDescription

let package = Package(
  name: "color-picker",
  platforms: [
    .macOS(.v10_15),
  ],
  targets: [
    .executableTarget(
      name: "color-picker",
      dependencies: [],
      path: "src"
    ),
  ]
)