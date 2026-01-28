import fs from "fs";
import fetch from "node-fetch";
import { load } from "cheerio";
import { nipponColor, ioResponseJson } from "../src/nipponColorTypes";

async function prebuild() {

    const resp = await fetch("https://nipponcolors.com");
    const data = await resp.text();
    const $ = load(data);
    const colorsElms = $("#colors").find("li");
    const colors: nipponColor[]= [];
    for (const e of colorsElms) {
      const cId = e.attribs.id;
      const name = $(`#${cId} div a`).text().split(", ")[1];
      if(!name) continue;
      const colorCode = await getColorProfile(name);
      const color: nipponColor = {name:name, colorCode:`#${colorCode}`} 
      console.log(`loading ${name} : #${colorCode}`);
      colors.push(color);
    }
    fs.writeFileSync("./assets/nipponColors.json", JSON.stringify(colors));
}

async function getColorProfile(colorName: string): Promise<string> {
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

prebuild();