// swift-tools-version: 5.6

import PackageDescription

let package = Package(
  name: "ruler",
  platforms: [
    .macOS(.v10_15),
],
  targets: [
    .executableTarget(
      name: "ruler",
      dependencies: []
    ),
  ]
)
