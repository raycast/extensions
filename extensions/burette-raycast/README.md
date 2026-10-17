# Burette for Raycast

This extension follows the useful part of the Raycast Linear experience: a keyboard-first command surface for finding and opening domain objects.

Commands:

- **Search Structures** searches configured folders for PDB, mmCIF/CIF, SDF/MOL, XYZ, trajectory, and MolViewSpec files.
- **Recent Structures** lists the 50 most recently modified matching files.
- **Open Selected in Burette** opens the selected Finder item with Burette (usable as a Finder quick action).

Install locally from this directory with `npm install` (or `bun install`) and `npm run dev`. The extension opens files through `open -a Burette`; set **Development CLI Path** in Raycast Preferences to `scripts/burette-agent.mjs` when testing a checkout without a packaged app.
