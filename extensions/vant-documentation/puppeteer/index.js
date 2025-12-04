import puppeteer from "puppeteer";
import fs from "fs-extra";

import {
  EN_US,
  ZH_CN,
  VERSION_2,
  VANT_WEBSITE,
  VANT_VERSION_LIST,
  DOCUMENTATION_PATH,
  pathResolve,
  Log,
  whileDuration,
  measureTask,
} from "./utils.js";

function filePathMap(component, version, language) {
    let filePath;

  const otherDocs = [
    "home",
    "quickstart",
    "advanced-usage",
    "faq",
    "changelog",
    "release-note-v4",
    "migrate-from-v2",
    "migrate-from-v3",
    "contribution",
    "design",
    "locale",

    "vant-use-intro",
    "use-click-away",
    "use-count-down",
    "use-custom-field-value",
    "use-event-listener",
    "use-page-visibility",
    "use-rect",
    "use-relation",
    "use-scroll-parent",
    "use-toggle",
    "use-window-size",
    "use-raf",
  ];

  const VERSION_MAP = {
    v4: "main",
    v3: "3.x",
    v2: "2.x",
  };

  if (otherDocs.includes(component)) {
    // https://api.github.com/repos/youzan/vant/contents/docs/markdown/home.en-US.md?ref=2.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/docs/markdown/home.en-US.md?ref=3.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/docs/markdown/home.en-US.md?ref=main

    // https://api.github.com/repos/youzan/vant/contents/docs/markdown/home.zh-CN.md?ref=2.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/docs/markdown/home.zh-CN.md?ref=3.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/docs/markdown/home.zh-CN.md?ref=main

    filePath = `${version !== VERSION_2 ? "/packages/vant" : ""}/docs/markdown/${component}.${language}.md`;
  } else {
    // https://api.github.com/repos/youzan/vant/contents/src/button/README.md?ref=2.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/src/button/README.md?ref=3.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/src/button/README.md?ref=main

    // https://api.github.com/repos/youzan/vant/contents/src/button/README.zh-CN.md?ref=2.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/src/button/README.zh-CN.md?ref=3.x
    // https://api.github.com/repos/youzan/vant/contents/packages/vant/src/button/README.zh-CN.md?ref=main

    filePath = `${version !== VERSION_2 ? "/packages/vant" : ""}/src/${component}/README${language === EN_US ? "" : "." + language}.md`;
  }

  filePath += `?ref=${VERSION_MAP[version]}`;

  return filePath;
}

async function crawlComponentDocumentation() {
  const log = new Log();

  log.info(`start`);

  const help = async (version, language) => {
    const browser = await puppeteer.launch({
      // If you need to open a headless browser, set it to false
      headless: true,
    });

    const page = await browser.newPage();

    await page.goto(`${VANT_WEBSITE}/${version}/#/${language}`, {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector(".van-doc-nav");

    const docs = await page.evaluate((version) => {
      const menu = [];

      const navs = document.querySelectorAll(".van-doc-nav__group");

      Array.from(navs).forEach((nav) => {
        const item = {};

        item.title = nav.querySelector(".van-doc-nav__title").innerText;
        item.items = [];

        const links = nav.querySelectorAll("a");

        Array.from(links).forEach((link) => {
          const linkItem = {};
          linkItem.title = link.innerText;
          linkItem.component = link.getAttribute("href").split("/").slice(-1)[0];
          linkItem.describe = "";
          linkItem.version = version;
          linkItem.filePath = "";
          item.items.push(linkItem);
        });

        menu.push(item);
      });

      return menu;
    }, version);

    for (const doc of docs) {
      for (const item of doc.items) {
        item.filePath = filePathMap(item.component, version, language);

        await page.goto(`${VANT_WEBSITE}/${version === "v4" ? "" : version}/#/${language}/${item.component}`, {
          waitUntil: "networkidle2",
        });

        whileDuration(1000);

        const selectorMap = {
          [EN_US]: "#intro",
          [ZH_CN]: "#jie-shao",
        };
        const selector = selectorMap[language];

        const describe = await page.evaluate(async (selector) => {
          let describe;

          await Promise.resolve()
            .then(() => (describe = document.querySelector(selector).nextElementSibling.innerText))
            .catch(
              () =>
                (describe = document
                  .querySelector(".van-doc-markdown-body")
                  .querySelectorAll(".van-doc-card")[0]
                  .querySelector("p").innerText),
            )
            .catch(() => (describe = ""));

          return describe.trim();
        }, selector);

        item.describe = describe;
      }
    }

    const file = pathResolve(`../${DOCUMENTATION_PATH}/${version}/${language}.json`);

    await fs.outputFile(file, JSON.stringify(docs));

    await browser.close();
  };

  for (const version of VANT_VERSION_LIST.reverse()) {
    await help(version, EN_US);
    await help(version, ZH_CN);
  }

  log.success(`end`);
}

async function start() {
  measureTask(crawlComponentDocumentation).then((time) => {
    console.log(`Total time taken: ${time} seconds`)
  });
}

start();
