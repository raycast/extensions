// swift-tools-version: 6.2
import PackageDescription

// Build an independent engine; no app bundle or remote runtime is required.
let package = Package(
    name: "LocalSearchEngine",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "local-search-engine", targets: ["digup"])],
    targets: [
        .target(name: "DigUpKit"),
        .systemLibrary(name: "CLlama", path: "Sources/CLlama"),
        .target(name: "LlamaRuntime", dependencies: ["CLlama", "DigUpKit"],
                linkerSettings: [.unsafeFlags(["-L\(Context.packageDirectory)/Vendor/llama/lib"])]),
        .executableTarget(name: "digup", dependencies: ["DigUpKit", "LlamaRuntime"]),
        .testTarget(name: "DigUpKitTests", dependencies: ["DigUpKit"]),
        .testTarget(name: "LlamaRuntimeTests", dependencies: ["LlamaRuntime"],
                    resources: [.copy("Reference")]),
    ]
)
