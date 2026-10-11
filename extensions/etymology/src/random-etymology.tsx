// Command: Show Random Etymology.
// Drawn from "English entries with etymology trees" rather than from all entries,
// so a random pick always has real ancestry behind it instead of bare prose.

import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { randomTermWithTree } from "./sources";
import { EntryDetail } from "./components/EntryDetail";

export default function Command() {
  const { data: term, isLoading, error } = usePromise(randomTermWithTree, []);

  if (isLoading) return <Detail isLoading markdown="" navigationTitle="Random Etymology" />;

  if (error || !term) {
    return (
      <Detail
        navigationTitle="Random Etymology"
        markdown={["# Could not reach Wiktionary", "", error?.message ?? ""].join("\n")}
      />
    );
  }

  return <EntryDetail term={term} />;
}
