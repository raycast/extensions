import QRCode from "qrcode";
import { exportAsUris } from "../../vendor/lib/data-transfer";
import type { AccountData } from "../../vendor/lib/types";

export function accountExportHeadingDataUrl(account: AccountData, theme: "light" | "dark"): string {
  const escapeXml = (text: string) =>
    Array.from(text)
      .map((character) => (character.charCodeAt(0) < 32 ? " " : character))
      .join("")
      .replace(
        /[&<>"']/g,
        (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&apos;",
          })[character]!,
      );
  const compact = (text: string, fontSize: number) => {
    let width = 0;
    let result = "";
    for (const character of Array.from(text)) {
      width += fontSize * (/[^\x20-\x7e]|[MW@]/.test(character) ? 1.1 : 0.75);
      if (width > 460 - fontSize) return escapeXml(`${result}…`);
      result += character;
    }
    return escapeXml(result);
  };
  const title = compact(account.issuer || account.name, 22);
  const subtitle = account.issuer ? compact(account.name, 14) : "";
  const primary = theme === "dark" ? "#f5f5f7" : "#1d1d1f";
  const secondary = theme === "dark" ? "#b8b8bd" : "#636366";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="52" viewBox="0 0 520 52"><g font-family="-apple-system, Helvetica Neue, Arial, sans-serif" text-anchor="middle"><text x="260" y="22" font-size="22" font-weight="600" fill="${primary}">${title}</text>${subtitle ? `<text x="260" y="46" font-size="14" fill="${secondary}">${subtitle}</text>` : ""}</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function accountSetupUri(account: AccountData): string {
  // The Key URI label reserves ASCII colons for the issuer/account separator.
  return exportAsUris([
    {
      ...account,
      name: account.name.replace(/:/g, "："),
      issuer: account.issuer.replace(/:/g, "："),
    },
  ]);
}

export function accountQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 4,
    scale: 8,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
