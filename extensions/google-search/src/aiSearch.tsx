import { LaunchProps } from "@raycast/api";
import { GoogleSearchList } from "./GoogleSearchList";

export default function Command(props: LaunchProps<{ arguments: Arguments.AiSearch }>) {
  const initialQuery = props.arguments?.query || props.fallbackText || "";
  return <GoogleSearchList initialMode="ai" initialQuery={initialQuery} />;
}
