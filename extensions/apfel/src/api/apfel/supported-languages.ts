import { runApfelScript } from ".";
import { Language } from "../../type";

export async function getSupportedLanguages(): Promise<Language[]> {
  const result = await runApfelScript("--model-info");

  const languagesRaw = result.match(/languages:\s+(.+)/)?.[1];
  if (!languagesRaw) return [];

  const languages = languagesRaw
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .filter((code, index, self) => self.indexOf(code) === index)
    .map((code) => ({
      name: new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code,
      code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return languages;
}
