// JXA batch renderer: draws SF Symbols to PNG files using the OS's own symbol
// assets, so icons exist for every symbol the user's macOS knows — no network.
// Invoked via `osascript -l JavaScript render-symbols.js <outDir> <namesJSON>`.
ObjC.import("AppKit");

function run(argv) {
  const outDir = argv[0];
  const names = JSON.parse(argv[1]);
  const config = $.NSImageSymbolConfiguration.configurationWithPointSizeWeightScale(100, 0.0, 3);
  let ok = 0;
  const fail = [];
  for (const name of names) {
    const base = $.NSImage.imageWithSystemSymbolNameAccessibilityDescription(name, $());
    if (base.js === undefined) {
      fail.push(name);
      continue;
    }
    const image = base.imageWithSymbolConfiguration(config);
    const rep = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
    if (rep.js === undefined) {
      fail.push(name);
      continue;
    }
    const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
    if (png.writeToFileAtomically(`${outDir}/${name}.png`, true)) ok++;
    else fail.push(name);
  }
  return JSON.stringify({ ok, fail });
}
