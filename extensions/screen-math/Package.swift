// swift-tools-version: 5.6

import PackageDescription

let package = Package(
  name: "screen-math",
  platforms: [
    .macOS(.v10_15),
],
  targets: [
    .executableTarget(
      name: "screen-math",
      dependencies: []
    ),
  ]
)
