# dicebook

## WebAssembly build

Install wasm-pack (for example, with `cargo install wasm-pack`) and build the cdylib target. The CI scripts place the output in a top-level `pkg/` folder, but you can also target `web/pkg` if you prefer to keep the bundle beside the UI:

```
wasm-pack build --target web --out-dir pkg
wasm-pack build --target web --out-dir web/pkg
```

The build exposes `WasmEngine` bindings (via `wasm-bindgen`) for evaluating expressions, persisting aliases, and importing characters through browser fetch APIs.

## Repeating roll groups

Use the caret (`^`) operator to repeat an expression a fixed number of times, re-rolling any dice and reapplying modifiers on every pass. For example, `(4d6kh3)^6` rolls six independent ability score sets, each logged separately when verbose mode is on, and then returns the combined total. This differs from multiplication, which would simply scale one result instead of rolling fresh dice.

With logging enabled, caret expressions produce grouped entries such as:

```
3

Details:
  [LOG][group:^1][roll] Rolled 1d1: [1]
  [LOG][group:^1][group] ^1 total: 1
  [LOG][group:^2][roll] Rolled 1d1: [1]
  [LOG][group:^2][group] ^2 total: 1
  [LOG][group:^3][roll] Rolled 1d1: [1]
  [LOG][group:^3][group] ^3 total: 1
```

## Structured logging controls

Logging can be enabled per category (assignments, expansions, roll events, and grouped roll summaries) across every interface:

- CLI: `--log` enables every category, while `--log-categories rolls,groups` restricts output to specific classes.
- REPL: run `log rolls groups` (comma or space-separated) to update categories, or `log none` to turn everything off.
- Web UI: toggle the log switches in the header to control which categories are sent to the console; changes apply only to future rolls.

## Web console

The `web/` directory contains a lightweight console UI that runs the WebAssembly bundle in the browser. Build the bundle and serve the static files with any HTTP server:

```
wasm-pack build --target web --out-dir web/pkg
npx serve web
```

The page wires your input to the exported evaluator, supports context import and reset operations, and provides an alias viewer alongside a CLI-inspired log.
