import { Palette } from "../models/palette.model";
import colorNamer from "color-namer";
import convert from "color-convert";
import { StorageService } from "./storage.service";
export class GeneratorService {
  private static CMY_HUES = [180, 300, 60];
  private static RGB_HUES = [360, 240, 120, 0];

  static async generatePalette(baseColor: string): Promise<Palette> {
    const fullColorCode = GeneratorService.getFullColorCode(baseColor);

    const name = GeneratorService.getColorName(fullColorCode);

    const response: Palette = {
      creationDate: new Date(),
      name,
      colors: {
        500: fullColorCode,
      },
    };

    const intensityMap: {
      [key: number]: number;
    } = {
      50: 0.95,
      100: 0.9,
      200: 0.75,
      300: 0.6,
      400: 0.3,
      600: 0.9,
      700: 0.75,
      800: 0.6,
      900: 0.45,
      950: 0.29,
    };

    [50, 100, 200, 300, 400].forEach((level) => {
      response.colors[level] = GeneratorService.lighten(fullColorCode, intensityMap[level]);
    });

    [600, 700, 800, 900, 950].forEach((level) => {
      response.colors[level] = GeneratorService.darken(fullColorCode, intensityMap[level]);
    });

    const palette = response as Palette;
    await StorageService.savePalette(palette);
    return palette;
  }

  private static getFullColorCode(hexColor: string) {
    const hexValue = hexColor.replace("#", "");
    return `#${hexValue.length === 3 ? hexValue.replace(/(.)/g, "$1$1") : hexValue.padEnd(6, "0")}`;
  }

  private static getColorName(color: string): string {
    const { name } = colorNamer(`#${color}`.replace("##", "#")).ntc[0];
    return name;
  }

  private static hueShift(hues: Array<number>, hue: number, intensity: number): number {
    const closestHue = hues.sort((a, b) => Math.abs(a - hue) - Math.abs(b - hue))[0],
      hueShift = closestHue - hue;
    return Math.round(intensity * hueShift * 0.5);
  }

  private static lighten(hex: string, intensity: number): string {
    if (!hex) {
      return "";
    }

    const [h, s, v] = convert.hex.hsv(hex);
    const hue = h + GeneratorService.hueShift(GeneratorService.CMY_HUES, h, intensity);
    const saturation = s - Math.round(s * intensity);
    const value = v + Math.round((100 - v) * intensity);

    return `#${convert.hsv.hex([hue, saturation, value])}`;
  }

  private static darken(hex: string, intensity: number): string {
    if (!hex) {
      return "";
    }

    const inverseIntensity = 1 - intensity;
    const [h, s, v] = convert.hex.hsv(hex);
    const hue = h + GeneratorService.hueShift(GeneratorService.RGB_HUES, h, inverseIntensity);
    const saturation = s + Math.round((100 - s) * inverseIntensity);
    const value = v - Math.round(v * inverseIntensity);

    return `#${convert.hsv.hex([hue, saturation, value])}`;
  }
}
