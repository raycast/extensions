# Implementation Patterns

Use this reference when the command needs implementation detail beyond the main workflow.

## Text-To-Text Commands

Use the encode/decode/hash shape for small text tools:

- Manifest: `mode: "view"` with optional `text` argument.
- Add dropdown arguments for finite modes discovered from CLI errors or help output.
- Input precedence: optional Raycast argument, selected text, clipboard text.
- Render `Form` immediately with defaults.
- Recompute output on debounced input changes.
- Show output in a non-editable field such as `Form.Description`.
- Make `Copy <Result>` the first Action.

## CLI Execution

- Use `execFile("delphitools", [...])`, not a shell string.
- Include `--quiet` for tools that can produce a plain stdout result.
- Pass user values as separate argv items.
- Trim trailing stdout with `trimEnd()`; avoid stripping meaningful leading spaces.
- On error, convert the error to a readable message and show a failure toast.

## Manifest Arguments

Prefer optional Raycast arguments when a user may provide input from root search:

```json
{
  "name": "text",
  "placeholder": "Text",
  "type": "text",
  "required": false
}
```

For finite CLI choices:

```json
{
  "name": "algorithm",
  "placeholder": "Algorithm",
  "type": "dropdown",
  "required": false,
  "data": [
    { "title": "SHA-256", "value": "sha256" }
  ]
}
```

After changing manifest arguments, run `npm run build` so Raycast regenerates `raycast-env.d.ts`.

## Progress Updates

When a command is implemented:

- Remove it from `## Not started`.
- Add it to `## Implemented`.
- Describe the real behavior, not just "Implemented".
- Include discovered finite options, e.g. "with md5, sha256, and sha512 support".
