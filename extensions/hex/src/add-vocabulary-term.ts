import { LaunchProps } from "@raycast/api";
import { runControl } from "./lib/feedback";
import { splitSpellings, vocabularyAddArgs } from "./lib/vocabulary";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AddVocabularyTerm }>) {
  const term = props.arguments.term.trim();
  const spellings = splitSpellings(props.arguments.soundsLike ?? "");
  await runControl(vocabularyAddArgs(term, spellings), {
    changed: `Added “${term}” to vocabulary`,
  });
}
