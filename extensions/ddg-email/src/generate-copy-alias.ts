import { generateAliasFromSavedToken } from "./lib/alias-command";

export default async function Command() {
  await generateAliasFromSavedToken();
}
