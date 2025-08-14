import Color from "colorjs.io";

export function getRGBValues(colorString: string) {
  const color = new Color(colorString).to("srgb");
  return {
    red: Math.round(color.coords[0] * 255),
    green: Math.round(color.coords[1] * 255),
    blue: Math.round(color.coords[2] * 255),
  };
}
