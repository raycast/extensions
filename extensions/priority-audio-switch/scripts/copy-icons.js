#!/usr/bin/env node
// Copy the Tabler Icons the extension uses from the @tabler/icons package into assets/icons.
// Run `npm run copy-icons` after changing the lists or the package version, then commit assets/icons.
//
// - assets/icons/system:  state icons the extension draws itself (priority numbers, hidden, muted, …).
//                         Never offered in Customize Device.
// - assets/icons/devices: icons the user can assign to a device, and the automatic defaults.
//
// "<name>.svg" is the outline icon, "<name>-filled.svg" the filled one (used for the current device) when Tabler
// has it. `currentColor` is replaced with black so Raycast can tint the icon with `tintColor`, and outline icons
// get a thinner stroke (Tabler's default is 2).

const fs = require("fs");
const path = require("path");

const SYSTEM = [
  "circle-number-1",
  "circle-number-2",
  "circle-number-3",
  "circle-number-4",
  "circle-number-5",
  "circle-dashed", // no priority
  "bolt", // Switch on Connect
  "eye-off", // hidden
  "microphone-off", // muted input
  "volume-off", // muted output
  "pin", // pinned volume
  "pinned-off", // unpin action
  // Action panel icons
  "volume", // select output device, unmute output
  "microphone", // select input device, unmute input
  "bolt-off", // turn off Switch on Connect
  "star", // set as top priority
  "arrow-up", // raise priority
  "arrow-down", // lower priority
  "list-numbers", // set priority…
  "pencil", // customize device
  "wand", // default icon in Customize Device
  "eye", // show device, show hidden devices
];

/** System icons that also need the filled variant (the current device). Others ship outline only. */
const SYSTEM_FILLED = new Set([...SYSTEM.filter((name) => name.startsWith("circle-number-")), "bolt"]);

const DEVICES = [
  // Automatic defaults (see defaultIconId in src/priority/icon-pool.ts)
  "device-laptop", // MacBook
  "device-imac", // iMac
  "devices-2", // Mac mini, Mac Studio, Mac Pro
  "device-speaker", // headphone jack
  "usb",
  "bluetooth",
  "cast", // AirPlay
  "device-desktop", // HDMI, DisplayPort
  "volume", // other outputs
  "microphone", // other inputs
  // More icons to pick in Customize Device
  "headphones",
  "headset",
  "device-airpods",
  "microphone-2",
  "device-tv",
];

const STROKE_WIDTH = "1.75";

const source = path.join(__dirname, "..", "node_modules", "@tabler", "icons", "icons");
const target = path.join(__dirname, "..", "assets", "icons");

function read(style, name) {
  const file = path.join(source, style, `${name}.svg`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

function prepare(svg) {
  return svg
    .replace(/currentColor/g, "#000000")
    .replace(/stroke-width="[^"]*"/g, `stroke-width="${STROKE_WIDTH}"`)
    .replace(/\s*class="[^"]*"/, "");
}

function copyGroup(folder, names, wantsFilled) {
  const dir = path.join(target, folder);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let count = 0;
  for (const name of names) {
    const outline = read("outline", name);
    if (!outline) {
      console.error(`Missing Tabler icon: ${name}`);
      process.exit(1);
    }
    fs.writeFileSync(path.join(dir, `${name}.svg`), prepare(outline));
    count++;
    const filled = wantsFilled(name) ? read("filled", name) : undefined;
    if (filled) {
      fs.writeFileSync(path.join(dir, `${name}-filled.svg`), prepare(filled));
      count++;
    }
  }
  console.log(`Copied ${count} icons to assets/icons/${folder}`);
}

if (!fs.existsSync(source)) {
  console.error("@tabler/icons is not installed. Run npm install first.");
  process.exit(1);
}

copyGroup("system", SYSTEM, (name) => SYSTEM_FILLED.has(name));
copyGroup("devices", DEVICES, () => true);
