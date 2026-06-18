// opencc-js ships its dictionary tables as a supported subpath export
// ("./*" in its package.json) but without bundled type declarations. Each
// dictionary module default-exports an OpenCC dictionary string (DictLike).
declare module "opencc-js/dict/*" {
  const dict: string;
  export default dict;
}
