import { Clipboard, getPreferenceValues } from "@raycast/api";
import { format } from "prettier";

import { Language, Parser, Preferences } from "./types";

const readClipboard = async (): Promise<string> => (await Clipboard.readText()) || "";

const formatCode = (parser: Parser) => {
  const preferences = getPreferenceValues<Preferences>();
  const printWidth = parseInt(preferences.printWidth || "100", 10);

  return async (query: string): Promise<string> => format(query, { parser, printWidth });
};

const copyClipboard = async (code: string): Promise<string> => {
  await Clipboard.copy(code);
  return code;
};

const wrapWithCodeblock = (language: Language) => {
  return (code: string) => ["```", " ", language, "\n", code, "\n", "``` "].join("");
};

export const pipeline = async (language: Language, parser: Parser): Promise<string> => {
  return readClipboard().then(formatCode(parser)).then(copyClipboard).then(wrapWithCodeblock(language));
};
