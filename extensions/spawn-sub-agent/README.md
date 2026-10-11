# Agent Fork

Agent Fork provides agency primitives. It does not prescribe governance.

Agent Fork is a Raycast AI Extension tool that delegates a task to an Ollama-compatible model and returns structured execution metadata and observed evidence. Callers can attach generic relationship, capability, lifecycle, and policy metadata without the extension assigning meaning to those fields.

## Public contract

- Spawn one child execution through the `spawn_sub_agent` tool.
- Preserve caller-provided or generated root, parent, and child identifiers.
- Carry caller-defined delegation metadata and capability descriptions.
- Return lifecycle state, model attempts, timing, output hashes, and observed output.
- Support optional caller-owned pre-dispatch and post-result HTTP hooks.
- Never self-certify completion: `doneVerified` is always `false`.

The extension does not assume a tracker, repository layout, CI/CD system, Definition of Done, or constitutional policy. A caller that needs those controls must provide and evaluate them through its own orchestration layer or hooks.

## Configuration

Set the Ollama endpoint, default model, timeout, fallback models, and audit-log preference in Raycast. Both local and remote HTTP(S) Ollama-compatible endpoints are supported.

## Development

```bash
npm install
npm test
npx tsc --noEmit
npm run lint
npm run build
```

The package registers the existing `spawn_sub_agent` tool in `package.json`.
