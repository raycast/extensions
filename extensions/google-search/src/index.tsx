import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { GoogleSearchList } from "./GoogleSearchList";

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const initialQuery = props.arguments?.query || props.fallbackText || "";
  const { returnAction } = getPreferenceValues<Preferences.Index>();
  return <GoogleSearchList initialMode={returnAction === "ai" ? "ai" : "default"} initialQuery={initialQuery} />;
}
