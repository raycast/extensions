import fs from "node:fs";
import path from "node:path";

export const EFF_WORD_LIST_FILE_NAME = "eff_large_wordlist.txt";
export const EFF_WORD_LIST_SIZE = 7_776;

export type LoadedPassphraseWords = {
  words: string[];
  source: "OS Dictionary" | "Bundled EFF";
};

export type LoadPassphraseWordsOptions = {
  bundledWordListPath?: string;
  bundledWordListText?: string;
  osDictionaryPaths?: string[];
};

export function getUsableDictionaryWords(dictionary: string): string[] {
  const wordsByDiceRoll = new Map<string, string>();

  for (const line of dictionary.split(/\r?\n/)) {
    const entry = /^([1-6]{5})\s+([a-z]+(?:-[a-z]+)*)$/.exec(line.trim());

    if (entry) {
      wordsByDiceRoll.set(entry[1], entry[2]);
    }
  }

  return [...new Set(wordsByDiceRoll.values())];
}

export function getUsableOsDictionaryWords(dictionary: string): string[] {
  return [
    ...new Set(
      dictionary
        .split(/\r?\n/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 6 && word.length <= 12 && /^[a-z]+$/.test(word)),
    ),
  ];
}

export function loadPassphraseWords(options: LoadPassphraseWordsOptions = {}): LoadedPassphraseWords {
  const dictionaryPaths = options.osDictionaryPaths ?? [
    "/usr/share/dict/words",
    "/usr/dict/words",
    ...getWindowsSpellingDictionaryPaths(),
  ];
  const dictionary = dictionaryPaths.map(readDictionaryFile).filter(Boolean).join("\n");
  const osWords = getUsableOsDictionaryWords(dictionary);

  if (osWords.length >= EFF_WORD_LIST_SIZE) {
    return { words: osWords, source: "OS Dictionary" };
  }

  const text =
    options.bundledWordListText ??
    (options.bundledWordListPath ? fs.readFileSync(options.bundledWordListPath, "utf8") : "");
  const words = getUsableDictionaryWords(text);

  if (words.length !== EFF_WORD_LIST_SIZE) {
    throw new Error("The bundled EFF word list is missing or incomplete. Reinstall Password Toolkit.");
  }

  return { words, source: "Bundled EFF" };
}

function getWindowsSpellingDictionaryPaths(): string[] {
  const spellingRoots = [process.env.APPDATA, process.env.LOCALAPPDATA]
    .filter((directory): directory is string => Boolean(directory))
    .map((directory) => path.join(directory, "Microsoft", "Spelling"));

  return spellingRoots.flatMap(getWindowsSpellingDictionaryPathsFromRoot);
}

function getWindowsSpellingDictionaryPathsFromRoot(spellingRoot: string): string[] {
  return getDirectoryEntries(spellingRoot).flatMap((localeDirectory) => {
    if (!localeDirectory.isDirectory()) {
      return [];
    }

    const localePath = path.join(spellingRoot, localeDirectory.name);

    return getDirectoryEntries(localePath)
      .filter((entry) => entry.isFile() && entry.name.endsWith(".dic"))
      .map((entry) => path.join(localePath, entry.name));
  });
}

function readDictionaryFile(dictionaryPath: string): string | undefined {
  try {
    return decodeDictionaryBuffer(fs.readFileSync(dictionaryPath));
  } catch {
    return undefined;
  }
}

function decodeDictionaryBuffer(buffer: Buffer): string {
  const hasUtf16LittleEndianBom = buffer[0] === 0xff && buffer[1] === 0xfe;
  const looksLikeUtf16LittleEndian = buffer.length > 2 && buffer[1] === 0x00;

  return buffer.toString(hasUtf16LittleEndianBom || looksLikeUtf16LittleEndian ? "utf16le" : "utf8");
}

function getDirectoryEntries(directory: string): fs.Dirent[] {
  try {
    return fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}
