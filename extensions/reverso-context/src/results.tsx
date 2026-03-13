import puppeteer, { Browser } from "puppeteer-core";
import { Contexts, LangCode, Translation, UsageExample } from "./domain";
import { codeToLanguageDict } from "./utils";
import { getPreferenceValues } from "@raycast/api";

export const setupBrowser = async () => {
  // get puppeteerExecutablePath preference from Raycast
  const puppeteerExecutablePath = getPreferenceValues<{ puppeteerExecutablePath: string }>().puppeteerExecutablePath;
  if (!puppeteerExecutablePath) {
    throw new Error("Puppeteer executable path is not set in preferences.");
  }

  return await puppeteer.launch({
    executablePath: puppeteerExecutablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

export const setupPage = async (browser: Browser) => {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  );
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    request.continue({
      headers: {
        ...request.headers(),
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  });
  return page;
};

export default async function getResults(text: string, sLang: LangCode, tLang: LangCode): Promise<[Contexts]> {
  const browser = await setupBrowser();
  const contexts = await getContexts(text, sLang, tLang, browser);
  await browser.close();
  return [contexts];
}

export async function getContexts(
  sText: string,
  sLang: LangCode,
  tLang: LangCode,
  browser: Browser,
): Promise<Contexts> {
  const page = await setupPage(browser);

  const contexts: Contexts = {
    examples: [],
    translations: [],
    ipa: "",
    searchText: "",
  };

  try {
    const url = `https://context.reverso.net/translation/${codeToLanguageDict[sLang]}-${codeToLanguageDict[tLang]}/${encodeURIComponent(sText)}`;

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".example", { timeout: 8000 });

    const contexts: [UsageExample[], Translation[], string, string] = await page.evaluate(
      (sLang, tLang, sText) => {
        const translations: Translation[] = [];
        const translationElements = document.querySelectorAll(".translation");
        translationElements.forEach((element) => {
          const translation = element.getAttribute("data-term") || "";
          ["n", "adv", "adj", "v"].forEach((pos) => {
            if (element.classList.contains(pos) && translation.trim() !== "") {
              translations.push({ translation, pos });
            }
          });
        });

        const examplesArray: UsageExample[] = [];
        const exampleElements = document.querySelectorAll(".example");

        exampleElements.forEach((element) => {
          const sExampleElement = element.querySelector(".src .text");
          // const sourceEmphasizedElement = sExampleElement?.querySelector("em");
          const tExampleElement = element.querySelector(".trg .text");
          const tTextElement = tExampleElement?.querySelector("em, .link_highlighted");
          if (!sExampleElement || !tExampleElement) {
            return;
          }
          const sExample = sExampleElement.textContent?.trim() || "";
          const tExample = tExampleElement.textContent?.trim() || "";
          const tText = tTextElement?.textContent?.trim() || "";

          examplesArray.push({
            sExample: sExample,
            tExample: tExample,
            sLang: sLang,
            tLang: tLang,
            sText: sText,
            tText: tText,
          });
        });

        // get the ipa
        const ipaElement = document.querySelector(".ipa");
        const ipa = ipaElement?.textContent?.trim() || "";

        // get the search text
        const searchTextElement = document.querySelector(".search-text");
        const searchText = searchTextElement?.textContent?.trim() || "";

        return [examplesArray, translations, ipa, searchText] as [UsageExample[], Translation[], string, string];
      },
      sLang,
      tLang,
      sText,
    );

    return { examples: contexts[0], translations: contexts[1], ipa: contexts[2], searchText: contexts[3] };
  } catch (err: unknown) {
    return contexts;
  } finally {
    await page?.close();
  }
}
