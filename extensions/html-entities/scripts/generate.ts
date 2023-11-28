import { elements, HTMLElement } from "../src/data";

import path from "node:path";
import fsP from "node:fs/promises";
import fs from "node:fs";

import { UltimateTextToImage, registerFont } from "ultimate-text-to-image";
import { Queue } from "async-await-queue";

registerFont(path.join(__dirname, "./SF-Pro.ttf"), { family: "SF Pro" });
registerFont(path.join(__dirname, "./SF-Pro-Text-Regular.otf"), { family: "SF Pro Text" });

const myq = new Queue(10);
const myPriority = -1;

const exportPath = path.join(__dirname, "../assets/images");

const ensureDir = async (dir: string, clear = false) => {
  const pathExists = await fsP.stat(dir).catch(() => false);
  if (!pathExists) {
    await fsP.mkdir(dir);
  }
  if (clear) {
    await fsP.rm(dir, { recursive: true });
    await fsP.mkdir(dir);
  }
};

let empty: string[] = [];

const generateImage = async (element: HTMLElement, dark = false) => {
  const css = element.css.replace(/\\/g, "");
  const img = new UltimateTextToImage(`${element.uni}`, {
    width: 200,
    height: 200,
    alignToCenterIfHeightLE: 200,
    alignToCenterIfLinesLE: 1,
    useGlyphPadding: true,
    fontSize: 100,
    lineHeight: 1,
    fontFamily: 'system-ui, BlinkMacSystemFont, "SF Pro", "SF Pro Text", "Segoe UI", Roboto, Helvetica',
    fontColor: dark ? "#ffffff" : "#000000",
    backgroundColor: dark ? "#000000" : "#ffffff",
    align: "center",
    valign: "center",
  }).render();

  if (
    img.measuredParagraph.width === 0 ||
    img.measuredParagraph.height === 0 ||
    (img.measuredParagraph.width === 77 && img.measuredParagraph.height === 100)
  ) {
    // When empty (or 77 x 100 which indicates an unrendered character) add to empty list
    empty.push(css);
  }

  console.log(
    css,
    img.renderedTime,
    img.measuredParagraph.width,
    img.measuredParagraph.height,
    img.measuredParagraph.text,
    img.hasRendered,
  );

  const streamImg = img.toStream();
  const out = fs.createWriteStream(path.join(exportPath, `${dark ? "dark" : "light"}/${css}.png`));
  streamImg.pipe(out);
  return new Promise<void>((resolve, reject) => {
    out
      .on("finish", () => {
        // console.log(`Generated ${dark ? 'dark' : 'light'}/${css}.png`);
        resolve();
      })
      .on("error", reject);
  });
};

const run = async () => {
  await ensureDir(exportPath, true);
  await ensureDir(path.join(exportPath, "dark"), true);
  await ensureDir(path.join(exportPath, "light"), true);

  const cssSet = new Set<string>();
  empty = [];

  elements.forEach((element) => {
    if (element.css) {
      if (cssSet.has(element.css)) {
        console.log(`Duplicate CSS for ${element.name}: `);
        console.log(elements.filter((e) => e.css === element.css));
        return;
      } else {
        cssSet.add(element.css);
      }
    } else {
      throw new Error(`No CSS for ${element.name}`);
    }
  });

  console.log(`Generating images... (${elements.length} elements)`);
  const total = elements.length;

  const q = [];
  let count = 0;
  const sorted = elements.sort((a, b) => a.css.localeCompare(b.css));

  for (const element of sorted) {
    const me = Symbol();

    q.push(
      myq
        .wait(me, myPriority)
        .then(() => {
          return Promise.all([generateImage(element, false), generateImage(element, true)]).then(() => {
            count++;
            console.log(`Generated ${element.css.replace(/\\/g, "")} (${count}/${total})`);
          });
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => myq.end(me)),
    );
  }

  await Promise.all(q);

  console.log("Empty images:");
  console.log(empty);

  console.log("Generating empty.json...");
  await fsP.writeFile(path.join(exportPath, "empty.json"), JSON.stringify(empty, null, 4));
};

run();
