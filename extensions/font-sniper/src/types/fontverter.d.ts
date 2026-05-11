declare module "fontverter" {
  type FontFormat = "sfnt" | "truetype" | "woff" | "woff2";

  function convert(
    buffer: Buffer,
    toFormat: FontFormat,
    fromFormat?: FontFormat,
  ): Promise<Buffer>;

  export default { convert };
}
