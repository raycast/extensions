# Assets (bundled)

Files in this folder are packaged into the extension at build time. Only keep what the extension needs at runtime.

## Layout

```
assets/
├── icons/     # Extension & command icons (referenced in package.json)
└── gif/       # Onboarding GIFs (referenced in SetupGuide.tsx)
```

### `icons/`

512×512 PNG icons used by `package.json` and OAuth (`auth.ts`):

| File | Used by |
|------|---------|
| `extension-icon.png` | Extension icon |
| `browse-icon.png` | Browse command |
| `search-icon.png` | Search command |
| `last-folder-icon.png` | Open Last Folder command |
| `recent-uploads-icon.png` | Recent Uploads command |

### `gif/`

| File | Used by |
|------|---------|
| `frameio_raycast_demo.gif` | Setup guide — plugin demo |
| `frameio_raycast_setup.gif` | Setup guide — Adobe Client ID tutorial |

## Editing icons

1. Export a 512×512 PNG
2. Copy the final icon into `icons/` with the matching runtime filename
