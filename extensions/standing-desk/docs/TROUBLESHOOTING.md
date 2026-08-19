# Troubleshooting

## Desk discovery times out

1. Confirm Bluetooth is enabled.
2. Hold the desk Bluetooth button until its light flashes.
3. Move the Mac within 8 meters of the desk.
4. Quit other desk-control applications.
5. Open **Manage Standing Desk**, then open **Desk Settings**.
6. Select **Scan for Desks**.
7. Select the desk from the **Desk** dropdown.

The scan also includes the remembered desk and compatible devices already connected to macOS. The fallback scan matches Bluetooth names containing `Desk`. Change **Discovery Name Filter** when the desk uses another name.

Discovery does not connect to or move the desk. The first status or movement command validates the selected device's Bluetooth services.

## Menu closes after selecting a position

This is normal macOS menu behavior. Raycast continues the dedicated Sit or Stand command and shows its progress separately.

The menu displays the last reported height without connecting first. Select **Refresh Height** to request a new reading without moving the desk.

## Bluetooth access is denied

Open **System Settings > Privacy & Security > Bluetooth**. Enable access for **IDÅSEN Desk Bluetooth Helper**.

If the helper is absent, run **Manage Standing Desk** once to trigger the permission request.

## Height has a constant offset

Change **Base Height** in **Desk Settings**. The default is `62 cm`.

Measure the desktop surface at the lowest position. Use that measurement when the controller reports zero.

## Settings prevent movement

Open **Manage Standing Desk**, then open **Desk Settings**. Check these constraints:

- Base Height must not exceed Minimum Height.
- Minimum Height must be lower than Maximum Height.
- Sit and Stand heights must remain inside the configured range.
- Raise and Lower Step must be greater than `0 cm` and at most `20 cm`.

Use **Restore Default Settings** when the saved values are not usable. This restores the `62–127 cm` range, `70 cm` Sit position, `110 cm` Stand position, and `1 cm` step. Select the desk and review the safety notice again.

## Inspect diagnostic logs

Open **Manage Standing Desk**, then select **Diagnostic Log**. The extension reveals `standing-desk.log` in Finder.

The log stores native command starts, outcomes, and errors. It excludes the stored Bluetooth identifier and rotates after `256 KiB`.

## Desk stops before the target

Check for an obstruction, load imbalance, or controller limit. The extension reports a stall after repeated stationary readings.

Do not increase timeouts or remove stall detection until the physical cause is excluded.

## Stop reports a connection error

The stop request file can still cancel an extension-owned movement. Use the physical control when the desk continues moving or another application owns the Bluetooth connection.

## Native helper is missing

Run:

```sh
npm run build:native
```

Then restart `npm run dev`.

## Raycast development command targets another app

Pin `@raycast/api` to a version compatible with the installed stable Raycast application. A newer major API can target a separate development bundle.

Check the installed app version:

```sh
defaults read /Applications/Raycast.app/Contents/Info CFBundleShortVersionString
```

## Another movement is active

Run **Stop Desk**. Wait for the active helper to release the movement lock, then retry.

If no movement exists, close Raycast and remove only the extension support lock after confirming no `deskctl` process is running.
