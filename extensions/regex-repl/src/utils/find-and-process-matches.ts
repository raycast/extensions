import { parseRegExpLiteral } from "regexpp";

const findAndProcessMatches = (
  pattern: string,
  flags: string[],
  text: string,
  matchProcessor: (matchedSection: string) => string = (m) => m
) => {
  try {
    const parsedExp = parseRegExpLiteral(`/${pattern}/${flags.join("")}`);
    const regex = new RegExp(parsedExp.pattern.raw, parsedExp.flags.raw);

    // e.g. text = 'hey hello hey', regex = /hey/g
    // => 2 sections ['hey', 'hey']
    const matchedSections = Array.from(text.matchAll(regex)).map(([text]) => text);

    // just a mutable version
    const mS = [...matchedSections];
    const preservedSections: string[] = []; // => ['', ' hello ']

    text.split("").reduce((prev, curr, index, arr) => {
      const substring = prev + curr; // => 'h' .. 'he' .. 'hey'
      if (substring.includes(mS[0])) {
        const s = substring.replace(mS[0], "");
        mS.shift();
        preservedSections.push(s);
        return "";
      }
      if (index === arr.length - 1) {
        // push the final section
        preservedSections.push(substring);
      }
      return substring;
    }, "");

    const noOfSections =
      matchedSections.length > preservedSections.length ? matchedSections.length : preservedSections.length;

    let result = "";
    for (let i = 0; i < noOfSections; i++) {
      if (preservedSections[i]) {
        result = result + preservedSections[i];
      }
      if (matchedSections[i]) {
        result = result + matchProcessor(matchedSections[i]);
      }
    }
    return { result, matchedSections, preservedSections };
  } catch (err) {
    const error = err as Error;
    const cleanError = error.message.replace("Invalid regular expression: ", "");
    throw new Error(cleanError);
  }
};
export default findAndProcessMatches;
