import fs from "fs";
import path from "path";
import { environment } from "@raycast/api";
import { onLoadingColors } from "./nipponColorTypes";
export class NipponColorAgent {
  private _colors: { [name: string]: string } = {};
  public get colors(): { [name: string]: string } {
    return this._colors;
  }
  public set colors(value: { [name: string]: string }) {
    this._colors = value;
  }

  public static async buildNipponColorAgent(notifier: onLoadingColors): Promise<NipponColorAgent> {
    const nca = new NipponColorAgent();
    const nipponColorsData = await fs.readFileSync(path.resolve(environment.assetsPath, "nipponColors.json"));
    const colors = JSON.parse(nipponColorsData.toString());
    for (const color of colors) {
      nca.colors[color.name] = color.colorCode;
      notifier(color.name, color.colorCode);
    }
    return nca;
  }
}
