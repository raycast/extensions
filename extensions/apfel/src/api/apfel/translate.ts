import { runApfelScript } from ".";

export async function apfelTranslate(from: string, to: string, text: string): Promise<string> {
  return await runApfelScript(`Translate the following from ${from} to ${to}, return only the translation: ${text}`);
}
