# Font Awesome

Search Font Awesome icons

# Setup

Download the icon pack from [Font Awesome](https://fontawesome.com/download) (download "Pro For Desktop").

Extract it and copy `svgs` into `./assets`.

Run the script that converts the SVGs into PNGs:

```sh
node scripts/convert-to-png.mjs
```

Run the script that compiles a JSON file with the icons:

```sh
node scripts/compile-list-of-icons.mjs
```

Then install the extension in Raycast, by copying the repo's folder into Raycast's local extensions folder.
