import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';

import type { RambdaFunction } from '../@types';

const turndown = new TurndownService();
const RAMBDA_URL = 'https://ramdajs.com/docs';

const reduceRambdaHTMLFunctionCards = (): Record<string, RambdaFunction> => {
  const updateAnchorElemHrefs = (node: HTMLElement | null) =>
    node?.querySelectorAll<HTMLAnchorElement>('a').forEach((elem) => elem.setAttribute('href', elem.href));

  // @ts-expect-error We can spread an iterable
  const cards = [...document.querySelectorAll('.card')] as HTMLDivElement[];

  return cards.reduce((documentation, currCard) => {
    const href = currCard.querySelector<HTMLAnchorElement>('a.name')?.href;
    const functionName = currCard.querySelector<HTMLAnchorElement>('a.name')?.textContent;
    // @ts-expect-error We can spread an iterable
    const addedInVersion = [...currCard.querySelectorAll<HTMLParagraphElement>('p')].find((pElem) =>
      pElem.textContent.includes('Added in')
    ).textContent;
    const descriptionNode = currCard.querySelector<HTMLDivElement>('div.description');
    updateAnchorElemHrefs(descriptionNode);
    const description = descriptionNode?.outerHTML;

    const codeExample = currCard.querySelector<HTMLPreElement>('pre code')?.textContent;
    const seeAlso = currCard.querySelector<HTMLDivElement>('.see');
    updateAnchorElemHrefs(seeAlso);

    // Skip function if it's missing any required data
    if (!(href && functionName && addedInVersion && description && codeExample)) {
      return documentation;
    }

    documentation[functionName] = {
      href,
      addedInVersion,
      functionName,
      description,
      codeExample,
      seeAlso: seeAlso?.outerHTML,
    };

    return documentation;
  }, {} as Record<string, RambdaFunction>);
};

const convertHtmlStringsToMarkdown = (functionData: Record<string, RambdaFunction>) => {
  Object.keys(functionData).forEach((key) => {
    const currDescription = functionData[key].description;
    const seeAlso = functionData[key].seeAlso;

    functionData[key].description = turndown.turndown(currDescription);
    functionData[key].seeAlso = seeAlso ? turndown.turndown(seeAlso) : undefined;
  });
};

const getRambdaFunctionsFromPage = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();

  await page.goto(RAMBDA_URL, {
    waitUntil: 'domcontentloaded',
  });

  // Get all the Rambda functions from the page
  const functionData: Record<string, RambdaFunction> = await page.evaluate(reduceRambdaHTMLFunctionCards);

  // Do any other required formatting
  convertHtmlStringsToMarkdown(functionData);

  // Dump to .json file
  fs.writeFileSync(path.resolve(__dirname, '../store/rambdaFunctionData.json'), JSON.stringify(functionData, null, 2));
};

// Start the scraping
getRambdaFunctionsFromPage().then(() => process.exit(1));
