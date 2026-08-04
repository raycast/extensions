import qrcode from "qrcode-generator";

// URL → SVG data URI. qrcode-generator는 sync라 render 중에 호출해도 안전.
// errorCorrectionLevel 'M'(기본)이 디자인/복원력 균형상 적당.
//
// SVG의 natural width/height는 module 수에 따라 달라지므로 (URL 길이가 길수록
// modules↑), 동일한 size 속성으로 override하여 어떤 URL이든 화면 표시 크기가
// 같아지도록 한다. viewBox는 원본 그대로 유지되어 SVG 내부가 해당 크기에 맞춰
// 스케일링된다.
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
