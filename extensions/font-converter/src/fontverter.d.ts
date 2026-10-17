declare module "fontverter" {
  type FontFormat = "sfnt" | "woff" | "woff2" | "truetype";

  function convert(buffer: Buffer, toFormat: FontFormat, fromFormat?: FontFormat): Promise<Buffer>;
  function detectFormat(buffer: Buffer): FontFormat;

  export default { convert, detectFormat };
}
