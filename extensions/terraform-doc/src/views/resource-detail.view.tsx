import { useEffect } from "react";
import fetch from "node-fetch";
import { Action, ActionPanel, Detail, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import {
  parseRawDoc,
  toResourceDocUrl,
  toResourceRawDocUrl,
} from "../lib/resource-detail";
import { Provider } from "../lib/provider";
import { ProviderVersion } from "../lib/provider-version";
import { Resource } from "../lib/resource";

export default function ResourceDetailView(props: {
  provider: Provider;
  version: ProviderVersion;
  resource: Resource;
}) {
  const [state, setState] = useCachedState<string | undefined>(
    `resource details of ${props.provider.id}/${props.version.id}/${props.resource.attributes.title}`,
    undefined,
    {
      cacheNamespace: `${environment.extensionName}`,
    },
  );
  useEffect(() => {
    async function updateResouceDetails() {
      try {
        if (state === undefined) {
          const markdown = await (
            await fetch(
              toResourceRawDocUrl(
                props.provider,
                props.version,
                props.resource,
              ),
            )
          ).text();
          setState(parseRawDoc(markdown));
        }
      } catch (err) {
        throw new Error(`${err}`);
      }
    }
    updateResouceDetails();
  }, []);
  return (
    <Detail
      markdown={state}
      navigationTitle={props.resource.attributes.title}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={`Open in Browser`}
            url={toResourceDocUrl(
              props.provider,
              props.version,
              props.resource,
            )}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
          />
          <Action.OpenInBrowser
            title={`Open Raw Doc in Browser`}
            url={toResourceRawDocUrl(
              props.provider,
              props.version,
              props.resource,
            )}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
}
