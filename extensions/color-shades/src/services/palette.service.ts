import { camelCase } from "change-case-all";
import { Palette } from "../models/palette.model";

export class PaletteService {
  static jsonStringPalette(palette: Palette): string {
    const slug = camelCase(palette.name);

    const colors = Object.fromEntries(Object.entries(palette.colors).map(([key, value]) => [`${key}`, `${value}`]));
    const paletteJson = { [slug]: colors };
    return JSON.stringify(paletteJson);
  }

  static variableDeclarationReadyPalette(palette: Palette): string {
    const slug = camelCase(palette.name);
    return Object.entries(palette.colors)
      .map(([key, value]) => `${slug}${key} = "${value}"`)
      .join("\n");
  }
}
