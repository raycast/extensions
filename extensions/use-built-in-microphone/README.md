# Use Built-in Microphone

When you're connected to AirPods (or similar), macOS often picks the headphone mic by default — and the audio quality can be awful. Sometimes not making use of Macbooks' great microphone is kinda pity.  

This command instantly switches your input to the built‑in Mac microphone. It’s not elegant, but it’s quick and clean enough for temporary use.

## Usage

- Ensure Raycast has Accessibility permissions in `System Settings → Privacy & Security → Accessibility`.
- Run the "Switch to Built-in Microphone" command and keep System Settings open until the HUD indicates success.
- The script selects the "MacBook … Microphone" input by iterating the Sound input devices list.

## Notes

- The AppleScript lives in `src/use-built-in-microphone.ts` so you can tweak the search logic or target a different device.
- If the UI structure changes in future macOS releases, re-record the UI element paths with `UIElementInspector` or `Accessibility Inspector`.

## References

- Similar approach: `toggle-fn` (another great extension in raycast that automates a System Settings toggle via AppleScript).
- Alternative tool: AirPodsSanity → https://github.com/Gaulomatic/AirPodsSanity
  - It looks great, but it didn’t work on my machine — and I personally prefer keeping background processes minimal/clean.

## Future Ideas

- Add an event listener to auto‑switch to the internal mic when AirPods connect or when the active input changes. This might require a small helper/agent outside Raycast or a smarter AppleScript trigger, but could be neat if kept lightweight.

## Troubleshooting

- If you see errors about not finding the "Sound" window, try running the command again — System Settings can be slow to initialize. The script already waits for UI readiness, but timing on different machines can vary.
- Double‑check Accessibility permissions for Raycast. If elements still aren’t clickable, toggle the permission off/on and relaunch Raycast.
