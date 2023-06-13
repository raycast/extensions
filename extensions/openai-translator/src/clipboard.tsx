import { getPreferenceValues, LaunchProps } from "@raycast/api";
import getBase from "./base";
import { TranslateMode } from "./providers/types";

export default function Command(props: LaunchProps) {
  const { mode } = getPreferenceValues<{ mode: TranslateMode }>();
  return getBase(props, mode, true, false, true);
}
