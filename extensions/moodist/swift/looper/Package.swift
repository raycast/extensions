// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "looper",
  platforms: [
    .macOS(.v12)
  ],
  targets: [
    .executableTarget(name: "looper", path: "Sources"),
  ]
)
