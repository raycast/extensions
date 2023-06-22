function toSvg(path: string, width: number, height: number): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
}

function toDataURI(svg: string): string {
  return `data:image/svg+xml,${svg}`;
}

function toURL(setId: string, id: string): string {
  return `https://api.iconify.design/${setId}/${id}.svg`;
}

export { toSvg, toDataURI, toURL };
