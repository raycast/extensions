import CommandView from "./views/command/command-view";
import { FIX_SPELLING_AND_GRAMMAR_COMMAND_ID } from "./hooks/useCommand";
import { LaunchProps } from "@raycast/api";

export default function FixSpellingAndGrammar(props: LaunchProps) {
  return <CommandView {...props} launchContext={{ commandId: FIX_SPELLING_AND_GRAMMAR_COMMAND_ID }} />;
}
