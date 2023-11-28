import path from "node:path";
import fsP from "node:fs/promises";

import nodeHtmlToImage from "node-html-to-image";
import { Queue } from "async-await-queue";

const myq = new Queue(4);
const myPriority = -1;

import { elements, HTMLElement } from "../src/data";

const exportPath = path.join(__dirname, "../assets/images");

const generateImage = async (element: HTMLElement, dark = false) => {
  const css = element.css.replace(/\\/g, "");
  await nodeHtmlToImage({
    output: path.join(exportPath, `${dark ? "dark" : "light"}/${css}.png`),
    puppeteerArgs: {
      // args: ['--no-sandbox'],
    },
    html: `
        <html>
            <head>
                <style>
                    body {
                        width: 200px;
                        height: 200px;
                        background-color: ${dark ? "#000000" : "#ffffff"};
                        color: ${dark ? "#ffffff" : "#000000"};
                        font-size: 100px;
                        line-height: 200px;
                        text-align: center;
                        font-family: system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                </style>
            </head>
            <body>${element.uni}</body>
        </html>
        `,
  }).then(() => {
    console.log(`Generated ${dark ? "dark" : "light"}/${css}.png`);
  });
};

const run = async () => {
  const cssSet = new Set<string>();

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

  const readEmpty = await fsP.readFile(path.join(exportPath, "empty.json"), "utf-8");
  const empty = JSON.parse(readEmpty) as string[];

  console.log(`Empty: ${empty.length}`);

  const renderElements = elements
    .filter((element) => empty.includes(element.css.replace(/\\/g, "")))
    .sort((a, b) => a.css.localeCompare(b.css));
  const extraElements = []
    .map((cssID) => elements.find((element) => element.css.toUpperCase().includes(cssID))!)
    .filter((el) => el) as HTMLElement[];

  const all = [...renderElements, ...extraElements].reduce(
    (acc, cur) => {
      if (!acc[cur.css]) {
        acc[cur.css] = cur;
      }
      return acc;
    },
    {} as Record<string, HTMLElement>,
  );
  const allElements = Object.values(all);

  const total = allElements.length;
  let count = 0;

  console.log("Generating images...");

  const q = [];
  for (const element of allElements) {
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

  await fsP.rm(path.join(exportPath, "empty.json"));
};

run();
