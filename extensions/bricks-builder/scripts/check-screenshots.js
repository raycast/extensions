// Stops `npm run publish` until Store screenshots exist in metadata/.
// Make them with scripts/store-screenshots.py, or Raycast's Window Capture ("Save to Metadata").
const fs = require("fs");

const shots = fs.existsSync("metadata") ? fs.readdirSync("metadata").filter((f) => f.endsWith(".png")) : [];

if (shots.length === 0) {
  console.error(
    'No Store screenshots in metadata/. Run `npm run dev`, take 3–6 window screenshots of Raycast, then run `python3 scripts/store-screenshots.py <the files>` (or use Raycast\'s Window Capture with "Save to Metadata").',
  );
  process.exit(1);
}
