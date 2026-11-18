import { Action, Keyboard } from "@raycast/api";
import { buildPapraUrl } from "./papra";
import { useCachedState } from "@raycast/utils";

export default function OpenInPapra({ route }: { route: string }) {
  const [selectedOrganizationId] = useCachedState("selected-organization-id", "");
  const url = buildPapraUrl(`organizations/${selectedOrganizationId}/${route}`).toString();
  return <Action.OpenInBrowser title="Open in Papra" url={url} shortcut={Keyboard.Shortcut.Common.Open} />;
}
