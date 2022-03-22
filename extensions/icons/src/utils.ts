function wrapIcon(path: string, height: number, width: number) {
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
  return svg;
}

export {
  wrapIcon,
};
