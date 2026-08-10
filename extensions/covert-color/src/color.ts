import tinyColor from "tinycolor2";
import { ColorDescribe } from "./type";
import { isWord } from "./utils";

export type ColorType = "rgb" | "hsl" | "hex" | "named";
type CorrectionFn = (i: string) => string;
type ColorTypeMatcher = {
  type: ColorType;
  reg: RegExp;
};
export const colorCorrection: Record<Exclude<ColorType, "named">, CorrectionFn> = {
  hex(input) {
    let output = input.replace(/^#/g, "");
    const len = output.length;
    if (len === 0) return "#";
    /**
     * a => aa0000
     * ab => aabb00
     * abc => aabbcc
     * abcd => aabbccdd
     * */
    if (len <= 4) {
      output = output
        .split("")
        .map((s) => s.repeat(2))
        .join("");
    }

    output = output.padEnd(6, "0");
    output = output.padEnd(8, "f");

    return `#${output}`;
  },

  rgb(input) {
    const output = input.replace(/[^\d,.]/g, "");
    const [r, g = 0, b = 0, a = 1] = output.split(",");

    return `rgba(${r}, ${g}, ${b}, ${a})`;
  },

  hsl(input) {
    const output = input.replace(/[^\d,.]/g, "");
    const [h, s = 100, l = 50, a = 1] = output.split(",");

    return `hsla(${h}, ${s}, ${l}, ${a})`;
  },
};

const typeMatcher: ColorTypeMatcher[] = [
  { type: "hex", reg: /^#/ },
  { type: "rgb", reg: /^rgb/i },
  { type: "hsl", reg: /^hsl/i },
  { type: "named", reg: /.+/ },
];

export function getColorType(colorStr: string): ColorType {
  return typeMatcher.find((m) => m.reg.test(colorStr))!.type;
}

export function dealWithNamedColor(name: string): ColorDescribe[] {
  if (!isWord(name)) {
    return [];
  }
  const reg = new RegExp(name, "i");
  const optionalNames = Object.keys(tinyColor.names).filter((name) => reg.test(name));

  if (optionalNames.length === 0) {
    return dealWithOthers(name, "hex");
  } else if (optionalNames.length === 1) {
    return dealWithOthers(tinyColor.names[optionalNames[0] as keyof typeof tinyColor.names], "hex");
  } else {
    return optionalNames.map((name) => {
      return {
        title: name,
        subtitle: "CSS Named Color",
      };
    });
  }
}

export function dealWithOthers(input: string, type: Exclude<ColorType, "named">): ColorDescribe[] {
  const color = tinyColor(colorCorrection[type](input));
  if (!color.isValid()) return [];
  const hasAlpha = color.getAlpha() < 1;
  const alphaSuffix = hasAlpha ? "A" : "";

  const options = [
    { name: hasAlpha ? color.toHex8String() : color.toHexString(), desc: "CSS Hexadecimal" },
    { name: color.toRgbString(), desc: `CSS RGB${alphaSuffix}` },
    { name: color.toPercentageRgbString(), desc: `CSS Percentage RGB${alphaSuffix}` },
    { name: color.toHslString(), desc: `CSS HSL${alphaSuffix}` },
  ];

  const colorName = color.toName();
  colorName && options.unshift({ name: colorName, desc: "CSS Named Color" });

  return options.map(({ name, desc }) => {
    return {
      title: name,
      subtitle: desc,
    };
  });
}
