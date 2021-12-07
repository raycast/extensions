import { Script } from "../type";

export const hexToRgb: Script = {
  info: {
    title: "Hex To Rgb",
    desc: "Convert color in hexadecimal to RGB",
    type: ["list", "form", "clipboard"],
    example: "#51cf75",
  },
  run(input) {
    const R = parseInt(cutHex(input).substring(0, 2), 16);
    const G = parseInt(cutHex(input).substring(2, 4), 16);
    const B = parseInt(cutHex(input).substring(4, 6), 16);
    return R.toString().concat(",").concat(G.toString()).concat(",").concat(B.toString());
  },
};

function cutHex(h: string) {
  return h.charAt(0) == "#" ? h.substring(1, 7) : h;
}
