declare module "color-namer" {
  interface ColorMatch {
    name: string;
    hex: string;
    distance: number;
  }

  interface ColorResults {
    basic: ColorMatch[];
    ntc: ColorMatch[];
    html: ColorMatch[];
    x11: ColorMatch[];
    pantone: ColorMatch[];
  }

  interface Options {
    pick?: ("basic" | "ntc" | "html" | "x11" | "pantone")[];
  }

  function namer(color: string, options?: Options): ColorResults;
  export = namer;
}
