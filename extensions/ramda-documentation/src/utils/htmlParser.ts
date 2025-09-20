import TurndownService from 'turndown';
import { parse, HTMLElement } from 'node-html-parser';
import { CONSTANTS } from './constants';

import type { RamdaFunctionList } from '../../@types';

const turndown = new TurndownService();

/**
 * The documentation anchor refs are all relative to the page. Update them to include the full documentation
 * url
 */
const updateAnchorElemHrefs = (parentNode: HTMLElement | null) =>
  parentNode
    ?.querySelectorAll('a')
    .forEach((elem) => elem.setAttribute('href', CONSTANTS.RAMDA_URL + elem.getAttribute('href')));

export const getHref = (card: HTMLElement) => CONSTANTS.RAMDA_URL + card.querySelector('a.name').getAttribute('href');

export const getFunctionName = (card: HTMLElement) => card.querySelector('a.name')?.textContent;

export const getAddedInVersion = (card: HTMLElement) =>
  // @ts-expect-error We can spread an iterable
  [...card.querySelectorAll<HTMLParagraphElement>('p')].find((pElem) => pElem.textContent.includes('Added in'))
    .textContent;

export const getDescription = (card: HTMLElement) => {
  const descriptionNode = card.querySelector('div.description');
  updateAnchorElemHrefs(descriptionNode);
  return turndown.turndown(descriptionNode?.outerHTML);
};

export const getCodeExample = (card: HTMLElement) => {
  const codeHtml = parse(card.querySelector('pre').innerHTML);
  return codeHtml.querySelector('code').textContent;
};

export const getSeeAlso = (card: HTMLElement) => {
  const seeAlso = card.querySelector('.see');
  updateAnchorElemHrefs(seeAlso);

  return seeAlso ? turndown.turndown(seeAlso?.outerHTML) : undefined;
};

export const reduceRamdaHTMLFunctionCards = (page: HTMLElement): RamdaFunctionList => {
  const cards = [...page.querySelectorAll('.card')] as HTMLElement[];

  return cards.reduce((documentation, currCard) => {
    const href = getHref(currCard);
    const functionName = getFunctionName(currCard);
    const addedInVersion = getAddedInVersion(currCard);
    const description = getDescription(currCard);
    const codeExample = getCodeExample(currCard);
    const seeAlso = getSeeAlso(currCard);

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
      seeAlso,
    };

    return documentation;
  }, {});
};
