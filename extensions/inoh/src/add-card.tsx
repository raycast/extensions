import { LaunchProps } from "@raycast/api";
import { CommandRoot } from "./components/CommandRoot";

/** Context handed over by the "Search Word from Screenshot" command. */
type SearchWordLaunchContext = {
  screenshotText?: string;
};

/**
 * "Search Word" command — opens the shared search list. Empty when launched
 * from the root search, pre-filled when "Search Word from Screenshot" passes
 * along the text it recognized in a screen capture.
 */
export default function AddCard({ launchContext }: LaunchProps<{ launchContext?: SearchWordLaunchContext }>) {
  return <CommandRoot initialSearchText={launchContext?.screenshotText} />;
}
