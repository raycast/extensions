xcrun coremlcompiler compile EmbeddingModel.mlpackage Sources/DocumentIndexer/Resources --platform macos --deployment-target 12.0

# generate Swift class
xcrun coremlcompiler generate --language Swift EmbeddingModel.mlpackage Sources/DocumentIndexer --platform macos --deployment-target 12.0