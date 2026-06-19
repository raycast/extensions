import { getPreferenceValues } from "@raycast/api";
import {
  type BaseLaunchContext,
  deliver,
  guardSize,
  parseWidth,
  readContent,
  reportFailure,
  type LaunchProps,
} from "./lib/pipeline.js";
import { wrap } from "./lib/wrap.js";

type WrapContext = BaseLaunchContext & {
  width?: number;
};

export default async function Command(
  props: LaunchProps<{ launchContext?: WrapContext }>,
) {
  const prefs = getPreferenceValues<Preferences.WrapText>();
  try {
    const input =
      props.launchContext?.text ?? (await readContent(prefs.source));
    guardSize(input);
    const width = props.launchContext?.width ?? parseWidth(prefs.width);
    const result = wrap(input, { width });
    await deliver({
      launchContext: props.launchContext,
      prefs,
      result,
      noun: "wrapped",
    });
  } catch (error) {
    await reportFailure(error, "Failed to wrap text");
  }
}
