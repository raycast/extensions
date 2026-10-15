import qrcode from "qrcode-generator";

// URL → SVG data URI. qrcode-generator is sync, so it is safe to call during render.
// errorCorrectionLevel 'M' (default) is a reasonable balance between design and resilience.
//
// The SVG's natural width/height depend on the module count (longer URL → more
// modules), so we override them with the same size attribute so every URL renders
// at the same on-screen size. The viewBox is kept as-is, so the SVG contents scale
// to fit that size.
export function qrSvgDataUri(url: string, size = 200): string | null {
  if (!url) return null;
  try {
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const svg = qr.createSvgTag({ cellSize: 4, margin: 2 });
    const resized = svg.replace(/\swidth="\d+"/, ` width="${size}"`).replace(/\sheight="\d+"/, ` height="${size}"`);
    return "data:image/svg+xml;utf8," + encodeURIComponent(resized);
  } catch {
    return null;
  }
}
