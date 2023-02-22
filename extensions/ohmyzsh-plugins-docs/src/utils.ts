import * as cheerio from "cheerio";

interface Section {
  name: string;
  level: number;
  content: string | null;
}

export function getSections(html: string): Section[] {
  const $ = cheerio.load(html);
  $.html();
  const sections: Section[] = [];

  //   let currentSection: Section | null = null;
  $("h1, h2, h3, h4, h5, h6").each((i, el) => {
    const $el = $(el);
    const level = parseInt($el[0].name[1]) - 1;
    const name = level === 0 ? "Summary" : $el.text();
    const content = $el.nextUntil("h1, h2, h3, h4, h5, h6").html();
    // const type = $el.nextUntil("h1, h2, h3, h4, h5, h6").html()?.includes("tr") ? "List" : "Detail";

    sections.push({ name: name, level: level, content: content });
  });
  return sections;
}

export function getSectionsFromMarkdown(markdown: string): Section[] {
  // const headingsRegex = /(^#+\s)(.*)(\s*#*$)/gm;
  const headingsRe = /#{1,6}\s.+(?=\n)/g;
  // const headings = markdown.match(headingsRe);
  const headingsArray = [...markdown.matchAll(headingsRe)];
  const sections: Section[] = [];

  headingsArray.forEach((heading, i) => {
    const level = heading[0].split(" ")[0].length - 1;
    const name = level === 0 ? "Summary" : heading[0].split("#").pop()?.trim();
    if (heading.index !== undefined && name !== undefined) {
      const content = markdown.slice(heading.index + heading[0].length, headingsArray[i + 1]?.index);
      sections.push({ name: name, level: level, content: content });
    } else {
      const content = null;
      const name = "";
      sections.push({ name: name, level: level, content: content });
    }
  });
  return sections;
}

interface ZshAlias {
  alias: string;
  command: string;
  description?: string;
}

export function getAliases(zsh: string): ZshAlias[] {
  const aliases: ZshAlias[] = [];
  const aliasRe = /^alias\s.*=.*\n/gm;
  const aliasArray = [...zsh.matchAll(aliasRe)];
  aliasArray.forEach((alias) => {
    const leftSide = alias[0].split("=")[0].trim();
    const aliasName = leftSide.split(" ")[1];
    const rightSide = alias[0].split("=")[1].trim();
    const aliasCommand = rightSide.slice(1, -1);
    aliases.push({ alias: aliasName, command: aliasCommand });
  });
  return aliases;
}

interface ZshFunction {
  name: string;
  body: string;
}

export function getFunctions(zsh: string): ZshFunction[] {
  const functions: ZshFunction[] = [];
  const functionRe = /function\s.*\(\)\s?\{/gm;
  const functionArray = [...zsh.matchAll(functionRe)];
  functionArray.forEach((func) => {
    const functionStart = func.index;
    const functionEndRe = /^}/gm;

    if (functionStart !== undefined) {
      const functionEnd = zsh.slice(functionStart).search(functionEndRe);
      const functionName = func[0].split(" ")[1].split("(")[0];
      const functionBody = zsh.slice(functionStart, functionStart + functionEnd + 1);
      functions.push({ name: functionName, body: functionBody });
    }
  });
  return functions;
}

export function checkTableReMatch(tableRe: string[] | null) {
  if (tableRe) {
    // convert array to set to remove duplicates
    const tableReSet = new Set(tableRe);

    // check if table only has one element and if that element is ||
    if (tableReSet.size === 1 && tableReSet.has("||")) {
      return false;
    } else {
      return true;
    }
  }
}

export type { ZshAlias, ZshFunction };
