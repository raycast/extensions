import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";

async function crawlMenuDocumentation() {
  const browser = await puppeteer.launch({
    // If you need to open a headless browser, set it to false
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto("https://es6.ruanyifeng.com", {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector("#sidebar");

  const docs = await page.evaluate(() => {
    const menu = [];

    const links = document.querySelectorAll("ol li a");

    Array.from(links).forEach((link) => {
      const title = link.innerText;

      const file = link.getAttribute("href").split("#").slice(-1)[0];

      menu.push({
        title,
        filePath: file,
      });
    });

    return menu;
  });

  const file = path.resolve(`../src/documentation/menu.json`);

  await fs.outputFile(file, JSON.stringify(docs));

  await browser.close();
}

async function start() {
  await crawlMenuDocumentation();
}

start();
