import { encode } from 'js-base64';

function toSvg(path: string, width: number, height: number): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

function toBase64(svg: string): string {
  return `data:image/svg+xml;base64,${encode(svg)}`;
}

export { toSvg, toBase64 };
