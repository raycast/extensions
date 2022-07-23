function toSvg(path: string, width: number, height: number): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

function toBase64(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString(
    'base64',
  )}`;
}

export { toSvg, toBase64 };
