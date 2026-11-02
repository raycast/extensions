<img src="assets/icon.png" width="64" height="64" alt="">

# Geolocation

Copy your current location to the clipboard from Raycast. Type `geo` or `copy location` in Raycast and run **Copy Location**.

The location comes from macOS Location Services (Wi-Fi and GPS), so it is accurate to a few meters, unlike IP-based lookups. The **Format** preference picks what is copied:

| Format           | Example                                                            |
| ---------------- | ------------------------------------------------------------------ |
| Coordinates      | `55.75580, 37.61730`                                               |
| Google Maps link | `https://www.google.com/maps?q=55.75580,37.61730`                  |
| Apple Maps link  | `https://maps.apple.com/?ll=55.75580,37.61730&q=55.75580,37.61730` |
| Geo URI          | `geo:55.75580,37.61730`                                            |

## Location permission

On first run macOS asks to allow location access for **Raycast Geolocation**, a small helper app that the extension creates in its own data folder. If you denied it, allow it in System Settings → Privacy & Security → Location Services.

## How it works

The location comes from Core Location through a Swift package in `swift/`, which Raycast's Swift bridge ([extensions-swift-tools](https://github.com/raycast/extensions-swift-tools)) compiles during the build. macOS only shows the location prompt to an app bundle, so on first run `src/location-app.ts` copies the compiled binary into `Raycast Geolocation.app` in the extension's support folder, signs it ad hoc and starts it with `open`.

The ad hoc signature ties the permission to the exact binary. Bump `APP_VERSION` in `src/location-app.ts` only when the Swift code or the Info.plist changes, because every rebuild of the bundle asks for permission again.

## Development

Requires Xcode 16.3 or later.

```sh
npm install
npm run dev     # run in Raycast with hot reload
npm run lint    # ESLint and Prettier
npm run build   # production build, also type-checks
```
