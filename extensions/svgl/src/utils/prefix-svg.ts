export const getPrefixFromSvgUrl = (svgUrl: string) => {
  return svgUrl.split("/").pop()!.replace(".svg", "").split("-").join("_");
};

export const prefixSvgIds = (content: string, prefix: string): string => {
  return content.replace(/id="([^"]+)"/g, `id="${prefix}-$1"`).replace(/url\(#([^"]+)\)/g, `url(#${prefix}-$1)`);
};
