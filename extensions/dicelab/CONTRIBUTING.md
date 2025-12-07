## WASM Provenance

This extension uses the Dicelab dice DSL interpreter compiled to WebAssembly. The WASM module is built from Rust source code located in the main polyhedra repository using `wasm-pack` with `serde_wasm_bindgen` for data serialization. The build process is automated through GitHub Actions and produces artifacts that are deterministically verifiable from the source code.

## Development

The extension source code lives in the `raycast/` directory of the main polyhedra repository. The built extension is automatically pushed to the output repository by GitHub Actions on every commit to master.

### Building Locally

1. Build the WASM module for Node.js:
   ```bash
   wasm-pack build --target nodejs --out-dir raycast/wasm
   ```

2. Install dependencies:
   ```bash
   cd raycast
   npm install
   ```

3. Run the extension in development mode:
   ```bash
   npm run dev
   ```