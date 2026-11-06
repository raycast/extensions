# Plasticity Model Inspector

Search the objects in the model currently open in Plasticity from Raycast. Inspect solids, sheets, wires, groups, and empty objects, including parent groups and mesh vertex and triangle counts. Copy object information or a JSON model inventory.

The extension uses the protocol published in Plasticity’s official Blender bridge. It sends only a read-only model-list request. It does not change model geometry, selections, materials, or application settings.

## Setup

1. Open Plasticity with a license that supports the Blender bridge.
2. In **Plasticity → Preferences → Server**, enable the bridge server. Keep its host set to `localhost`.
3. Open a model, then run **Inspect Model Objects** in Raycast.

The default bridge port is **8980**, as specified by the official Blender add-on. If you configured another port, change **Bridge Port** in the extension preferences. The extension connects only to `127.0.0.1` on this Mac. It does not require Blender to be running.

## Commands and actions

**Inspect Model Objects** lists objects from the current model. Use the scope dropdown to retrieve **All Objects** or **Visible Objects**. Search by object name or type, inspect geometry counts, and use the copy actions to capture metadata. **Refresh Model** retrieves a new snapshot.

Triangle and vertex counts describe the bridge’s tessellation of solids and sheets. Wires, groups, and empty objects have no mesh payload in the published bridge protocol, so their mesh counts are zero. The extension does not export geometry.

## Compatibility

The bridge is a vendor-published integration protocol originally built for Blender. The parser and real local WebSocket client have automated fixture coverage. Live all-object and visible-object inventories passed against Plasticity 25.3.8. The extension sends direct list requests supported by both the original and current official bridge clients. Models larger than 64 MB of bridge data or 100,000 objects are rejected with a clear error.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

## Sources

- [Plasticity’s official site and license features](https://www.plasticity.xyz/)
- [Official Plasticity Blender bridge](https://github.com/nkallen/plasticity-blender-addon)
- [Published protocol implementation](https://github.com/nkallen/plasticity-blender-addon/blob/main/client.py)
- [Published default bridge address](https://github.com/nkallen/plasticity-blender-addon/blob/main/__init__.py)
- [Raycast extension development](https://developers.raycast.com/basics/getting-started)
