# Geolocation

Copy your current location to the clipboard from Raycast. Type `geo` or `copy location` in Raycast and run **Copy Location**.

The location comes from macOS Location Services (Wi-Fi and GPS), so it is usually accurate to tens of meters, much closer than IP-based lookups. The **Format** preference picks what is copied:

| Format           | Example                                                            |
| ---------------- | ------------------------------------------------------------------ |
| Coordinates      | `55.75580, 37.61730`                                               |
| Google Maps link | `https://www.google.com/maps?q=55.75580,37.61730`                  |
| Apple Maps link  | `https://maps.apple.com/?ll=55.75580,37.61730&q=55.75580,37.61730` |
| Geo URI          | `geo:55.75580,37.61730`                                            |

## Location permission

On first run macOS asks to allow location access for **Raycast Geolocation**, a small helper app that the extension creates in its own data folder. If you denied it, allow it in System Settings → Privacy & Security → Location Services.
