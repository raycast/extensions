import { Script } from "../type";

export const hexToRgb: Script = {
  info: {
    title: "Hex to Rgb",
    desc: "Convert color in hexadecimal to RGB",
    type: ["list", "form", "clipboard"],
    example: "#51cf75",
  },
  run(input) {
    function cutHex(h: string) {
      return h.charAt(0) == "#" ? h.substring(1, 7) : h;
    }
    const R = parseInt(cutHex(input).substring(0, 2), 16);
    const G = parseInt(cutHex(input).substring(2, 4), 16);
    const B = parseInt(cutHex(input).substring(4, 6), 16);
    return R.toString().concat(",").concat(G.toString()).concat(",").concat(B.toString());
  },
};

export const rgbToHex: Script = {
  info: {
    title: "Rgb to Hex",
    desc: "Convert color in RGB to hexadecimal",
    type: ["list", "form", "clipboard"],
    example: "81,207,117",
  },
  run(input) {
    const rgbArray = input.includes(",") ? input.split(",") : input.split(" ");

    if (rgbArray.length !== 3) throw Error("Invalid RGB format");

    let hex = "#";

    try {
      rgbArray.forEach((c) => {
        hex += parseInt(c).toString(16);
      });
    } catch {
      throw Error("Invalid RGB value");
    }

    return hex.toUpperCase();
  },
};
