// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
  name: "keyboard",
  dependencies: [
    .package(url: "https://github.com/apple/swift-argument-parser", exact: "1.2.3")
  ],
  targets: [
    .target(
      name: "KeyboardClient",
      path: "Sources/ObjC/KeyboardClient",
      linkerSettings: [
        .unsafeFlags(["-F/System/Library/PrivateFrameworks"]),
        .linkedFramework("CoreBrightness")
      ]),
      .executableTarget(
        name: "keyboard",
        dependencies: [
          .byName(name: "KeyboardClient"),
          .product(name: "ArgumentParser", package: "swift-argument-parser")
        ],
        path: "Sources/Swift"
      )
  ]
)
