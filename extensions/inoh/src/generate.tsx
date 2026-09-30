import { LaunchProps } from "@raycast/api";
import { GenerateCardForm } from "./components/GenerateCardForm";

/** Context handed over by a search that found nothing for a word. */
type GenerateLaunchContext = {
  word?: string;
};

/**
 * "Generate" command — makes the card for a word the dictionary does not have.
 *
 * Opens empty from the root, or with the word already in it when the search
 * list hands one over, so a miss does not have to be typed twice.
 */
export default function Generate({ launchContext }: LaunchProps<{ launchContext?: GenerateLaunchContext }>) {
  return <GenerateCardForm initialWord={launchContext?.word} />;
}
