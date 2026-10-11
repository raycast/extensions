# JSON Preview

- This is a macOS Raycast extension. Use supported native Raycast components; custom HTML editors cannot be embedded in the public extension UI.
- The uTools plugin is a behavioral reference. Do not copy or claim to have recovered its proprietary source or assets.
- JSON, expressions and file contents stay local. Never send user documents to a remote service or log document contents.
- Run JavaScript transformations in the QuickJS WASM runtime with time, stack and memory limits, and no host callbacks. Do not use Node eval or node:vm as a security boundary.
- Preserve JSON numeric tokens during preview/formatting. Query execution follows JavaScript Number semantics and must warn before processing unsafe numeric inputs.
- Bound rendered previews and page large collections. Copy/export actions operate on the full value.
- Before delivery, run npm test, npm run typecheck, npm run lint and npm run build. Record UI acceptance separately from successful builds.
