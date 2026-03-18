# Glite Raycast Extension

Minimal Raycast extension with shortcuts for the Glite repo and local admin.

## Commands

- `Glite Just` takes an inline command and runs `just <your input>`
- Example: `ios`, `lint`, `aws`, or `l2-test +ARGS="tests/foo.py"`
- `Glite Admin` opens `http://localhost:8000/admin/`
- `Glite Repo` opens `https://github.com/GliteTech/glite`
- `Glite Deploy` opens `https://github.com/GliteTech/glite/actions/workflows/deploy_backend.yml`

## Development

```bash
npm install
npm run dev
```

Set the command preference `Glite Root` before using `Glite Just`.
