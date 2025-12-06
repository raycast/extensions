# Dicelab Raycast Extension

A powerful dice calculator extension for Raycast, using the Dicelab DSL compiled to WebAssembly.

## Features

- **Dice Expression Evaluation**: Roll dice and calculate results using the full Dicelab DSL
- **Probability Distributions**: View PMF charts with statistics (mean, std dev, variance, quantiles)
- **Persistent Context**: Your aliases and variables are saved between sessions
- **Aliases Management**: Define and view aliases using `let name = value`
- **D&D Beyond Import**: Import character stats directly from D&D Beyond
- **Full DSL Support**:
  - Dice notation: `d20`, `2d6+3`, `4d6kh3`
  - Variables: `let strength = 18`
  - Roll assignments: `let attack = d20 strength_mod`
  - Conditionals: `d20 > 10 ? 1d8 : 0`
  - Named groups: `(attack: d20+5, damage: 2d6+3)`
  - Advantage/disadvantage: `d20adv`, `d20dis`
  - Filters: `kh`, `kl`, `dh`, `dl`, `rr`, `ro`

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

## License

MIT
