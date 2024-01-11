// swift-tools-version: 5.8
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "DocumentSearcher",
    platforms: [
        .macOS(.v12)
    ],
    products: [
        .executable(name: "IndexDocument", targets: ["IndexDocument"]),
        .executable(name: "SearchIndex", targets: ["SearchIndex"]),
        .library(name: "VectorStore", targets: ["VectorStore"])
    ],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .executableTarget(name: "IndexDocument", dependencies: ["VectorStore"]),
        .executableTarget(name: "SearchIndex", dependencies: ["VectorStore"]),
        .target(
            name: "VectorStore",
            resources: [
                .copy("Resources/EmbeddingModel.mlmodelc"),
                .process("Resources/vocab.txt")
            ]
        )
    ]
)
