// opencc-js ships types for its full build only; this is the subset the
// Traditional-to-Simplified build exposes.
declare module "opencc-js/t2cn" {
  export function Converter(options: { from: "tw" | "hk" | "t"; to: "cn" }): (text: string) => string;
}
