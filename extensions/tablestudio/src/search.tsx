import { LaunchProps } from "@raycast/api";
import { CatalogList } from "./CatalogList";
import { StoredCredentials } from "./catalog";

/**
 * Also the target of TableStudio's "Connect Raycast" button, which deeplinks here with the
 * token in `launchContext`. Doing the handoff inside a real command rather than a dedicated
 * one keeps a setup-only entry out of Raycast's command list — and landing on your actual
 * search results is the clearest possible confirmation that it worked.
 *
 * The manifest `name` is therefore load-bearing: the app builds
 * `raycast://extensions/johntan/tablestudio/search` in `HTTPCatalogExporter.raycastConnectURL`.
 * Renaming the command breaks one-click setup silently.
 */
export default function Command(props: LaunchProps<{ launchContext?: Partial<StoredCredentials> }>) {
  return <CatalogList incomingCredentials={props.launchContext} />;
}
