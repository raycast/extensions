import { Color, rgb, p3 } from "culori";

export enum Space {
  sRGB = "sRGB",
  P3 = "P3",
  Rec2020 = "Rec2020",
  Out = "Out",
}

export function getSpace(color: Color): Space {
  // Hot fix until https://github.com/Evercoder/culori/issues/249 is fixed
  if (color.mode === "oklch" && color.l === 1 && color.c === 0) {
    return Space.sRGB;
  }

  const proxyColor = { ...color, alpha: color.alpha ?? 1 };

  const inRGB = (c: Color) => {
    const rgbColor = rgb(c);
    const r = rgbColor.r ?? -1;
    const g = rgbColor.g ?? -1;
    const b = rgbColor.b ?? -1;
    return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
  };

  const inP3 = (c: Color) => inRGB(p3(c));

  if (inRGB(proxyColor)) {
    return Space.sRGB;
  } else if (inP3(proxyColor)) {
    return Space.P3;
  } else {
    return Space.Out;
  }
}
