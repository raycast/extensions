import { LaunchProps } from "@raycast/api";
import RSSSearch from "./components/RSSSearch";
import RedirectRoute from "./components/RedirectRoute";

export default function CreateSourceForm(props: LaunchProps<{ launchContext: { defaultSearchText: string } }>) {
  const defaultSearchText = props?.launchContext?.defaultSearchText ?? "";
  return (
    <RedirectRoute>
      <RSSSearch defaultSearchText={defaultSearchText} />
    </RedirectRoute>
  );
}
