// swift-tools-version: 5.6
import PackageDescription

let package = Package(
  name: "raycast-openai-translator-tool",
  platforms: [
    .macOS(.v10_15),
],
  targets: [
    .executableTarget(
      name: "ocr",
      dependencies: [],
      sources: [
        "main.swift",
      ]
    ),
    .executableTarget(
      name: "lang",
      dependencies: [],
      sources: [
        "main.swift",
      ]
    ),
  ]
)
