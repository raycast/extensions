import QRCode from "qrcode";

export interface QROptions {
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  darkColor: string;
  lightColor: string;
  margin: number;
}

export const DEFAULT_QR_OPTIONS: QROptions = {
  errorCorrectionLevel: "H",
  darkColor: "#000000",
  lightColor: "#ffffff",
  margin: 4,
};

/** Inject explicit width/height so Raycast renders the SVG at a reasonable size in the Detail pane. */
function scaleSVG(svg: string, size = 280): string {
  return svg.replace(/<svg([^>]*)>/i, (_match, attrs) => {
    const stripped = attrs.replace(/\s*(width|height)="[^"]*"/gi, "");
    return `<svg${stripped} width="${size}" height="${size}">`;
  });
}

export async function generateSVG(content: string, opts: Partial<QROptions> = {}): Promise<string> {
  const o = { ...DEFAULT_QR_OPTIONS, ...opts };
  const svg = await QRCode.toString(content, {
    type: "svg",
    errorCorrectionLevel: o.errorCorrectionLevel,
    color: { dark: o.darkColor, light: o.lightColor },
    margin: o.margin,
  });
  return scaleSVG(svg, 280);
}

export async function generatePNG(content: string, opts: Partial<QROptions> = {}): Promise<Buffer> {
  const o = { ...DEFAULT_QR_OPTIONS, ...opts };
  return QRCode.toBuffer(content, {
    errorCorrectionLevel: o.errorCorrectionLevel,
    color: { dark: o.darkColor, light: o.lightColor },
    margin: o.margin,
    scale: 12, // 12px per module → crisp high-res output
  });
}
