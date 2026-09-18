// Command: Look Up Selection.
// getSelectedText() throws whenever the frontmost app exposes no selection, which
// is ordinary rather than exceptional, so the failure renders as guidance.

import { Detail, getSelectedText } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { EntryDetail } from "./components/EntryDetail";

export default function Command() {
  const { data: term, isLoading, error } = usePromise(selectedWord, []);

  if (isLoading) return <Detail isLoading markdown="" />;

  if (error || !term) {
    return (
      <Detail
        navigationTitle="Look Up Selection"
        markdown={[
          "# Nothing selected",
          "",
          "Select a word in any app, then run this command again.",
          "",
          "Use **Search Etymology** to type a word instead.",
        ].join("\n")}
      />
    );
  }

  return <EntryDetail term={term} />;
}

/**
 * Wiktionary has plenty of multi-word entries, so a short phrase is passed
 * through intact; anything longer is almost certainly a sentence the user
 * happened to have highlighted, and its first word is the better guess.
 */
async function selectedWord(): Promise<string> {
  const raw = (await getSelectedText()).trim();
  const cleaned = raw.replace(/^[^\p{L}\p{M}*-]+|[^\p{L}\p{M}*-]+$/gu, "");
  if (!cleaned) throw new Error("Selection has no word in it");

  const words = cleaned.split(/\s+/);
  return words.length <= 3 ? cleaned : words[0];
}
