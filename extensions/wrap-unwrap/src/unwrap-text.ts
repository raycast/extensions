import { getPreferenceValues } from "@raycast/api";
import {
  type BaseLaunchContext,
  deliver,
  guardSize,
  readContent,
  reportFailure,
  type LaunchProps,
} from "./lib/pipeline.js";
import { unwrap } from "./lib/unwrap.js";

type UnwrapContext = BaseLaunchContext & {
  hyphenation?: boolean;
  keepBlankLines?: boolean;
  flattenBullets?: boolean;
};

export default async function Command(
  props: LaunchProps<{ launchContext?: UnwrapContext }>,
) {
  const prefs = getPreferenceValues<Preferences.UnwrapText>();
  try {
    const input =
      props.launchContext?.text ?? (await readContent(prefs.source));
    guardSize(input);
    const hyphenation = props.launchContext?.hyphenation ?? prefs.hyphenation;
    const keepBlankLines =
      props.launchContext?.keepBlankLines ?? prefs.keepBlankLines;
    const flattenBullets =
      props.launchContext?.flattenBullets ?? prefs.flattenBullets;
    const result = unwrap(input, {
      hyphenation,
      keepBlankLines,
      flattenBullets,
    });
    await deliver({
      launchContext: props.launchContext,
      prefs,
      result,
      noun: "unwrapped",
    });
  } catch (error) {
    await reportFailure(error, "Failed to unwrap text");
  }
}
