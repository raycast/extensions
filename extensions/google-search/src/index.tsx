import { LaunchProps } from "@raycast/api";
import { GoogleSearchList } from "./GoogleSearchList";

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const initialQuery = props.arguments?.query || props.fallbackText || "";
  return <GoogleSearchList initialMode="default" initialQuery={initialQuery} />;
}
