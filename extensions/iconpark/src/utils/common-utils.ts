export { kebabToOtherCase, toBase64 };

function kebabToOtherCase(str: string, join: string) {
  const kebabArr = str.split("-");
  const _arr = kebabArr.map((value) => {
    if (value.length === 1) {
      return value.toUpperCase();
    } else {
      return value[0].toUpperCase() + value.substring(1);
    }
  });
  return _arr.join(join);
}

function toBase64(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
