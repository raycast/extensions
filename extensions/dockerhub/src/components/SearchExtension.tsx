import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { Hub } from "../lib/hub/hub";
import { ExtensionMetadata } from "../lib/hub/types";

export default function SearchExtensions() {
  const [loading, setLoading] = useState<boolean>(true);
  const [extensions, setExtensions] = useState<ExtensionMetadata[]>([]);

  const search = useCallback(
    (text) => {
      const abortCtrl = new AbortController();
      const fn = async () => {
        try {
          setLoading(true);
          const hub = new Hub();
          const exts = await hub.searchExtensions(text, abortCtrl.signal);
          setExtensions(exts);
        } catch (err) {
          showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: `${err}`,
          });
        } finally {
          setLoading(false);
        }
      };
      fn();
      return () => abortCtrl.abort();
    },
    [setExtensions, setLoading],
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={loading} throttle onSearchTextChange={search}>
      <List.Section title="Results" subtitle={extensions.length + ""}>
        {extensions.map((ext) => (
          <List.Item
            icon={ext.LatestVersion.Labels["com.docker.desktop.extension.icon"] ?? ""}
            key={ext.LatestVersion.ManifestListDigest}
            title={ext.LatestVersion.Labels["org.opencontainers.image.title"]}
            subtitle={ext.LatestVersion.Labels["org.opencontainers.image.vendor"]}
            accessories={[
              { text: ext.LatestVersion.Tag },
              ...ext.LatestVersion.Platforms.map((platform) => {
                return {
                  text: `${platform.OS}/${platform.Arch}`,
                };
              }),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={ext.url} />
                {ext.LatestVersion.Labels["com.docker.extension.publisher-url"] ? (
                  <Action.OpenInBrowser
                    title="Visit Publisher Website"
                    url={ext.LatestVersion.Labels["com.docker.extension.publisher-url"]}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
