// swift-tools-version: 5.6

import PackageDescription

let package = Package(
  name: "display-modes",
  platforms: [
    .macOS(.v10_15),
  ],
  dependencies: [
    .package(url: "https://github.com/apple/swift-argument-parser", from: "1.2.3"),
  ],
  targets: [
    .executableTarget(
      name: "display-modes",
      dependencies: [
        .product(name: "ArgumentParser", package: "swift-argument-parser")
      ]
    ),
  ]
)
