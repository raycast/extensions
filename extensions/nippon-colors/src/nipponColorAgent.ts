import fetch from "node-fetch";
import { load } from "cheerio";
import { ioResponseJson, onLoadingColors } from "./nipponColorTypes";
export class NipponColorAgent {
  public static BASE_URL = "https://nipponcolors.com";
  private _colors: { [name: string]: string } = {};
  public get colors(): { [name: string]: string } {
    return this._colors;
  }
  public set colors(value: { [name: string]: string }) {
    this._colors = value;
  }

  public static async buildNipponColorAgent(notifier: onLoadingColors): Promise<NipponColorAgent> {
    const nca = new NipponColorAgent();
    const resp = await fetch(NipponColorAgent.BASE_URL);
    const data = await resp.text();
    const $ = load(data);
    const colors = $("#colors").find("li");
    for (const color of colors) {
      const cId = color.attribs.id;
      const name = $(`#${cId} div a`).text().split(", ")[1];
      const colorCode = await nca.getColorProfile(name);
      nca.colors[name] = colorCode;
      notifier(name, colorCode);
    }
    return nca;
  }

  public async getColorProfile(colorName: string): Promise<string> {
    const response = await fetch("https://nipponcolors.com/php/io.php", {
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `color=${colorName}`,
      method: "POST",
    });
    const json: ioResponseJson = (await response.json()) as ioResponseJson;
    return json.rgb;
  }
}
