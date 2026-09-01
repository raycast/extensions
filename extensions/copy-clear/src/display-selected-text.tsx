import { LaunchProps } from "@raycast/api";
import { CharacterGrid } from "./character-grid";

type LaunchContext = { text?: string };

/** Receives freshly selected text from the no-view hotkey command. */
export default function DisplaySelectedText({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  return <CharacterGrid text={launchContext.text} />;
}
