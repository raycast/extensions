import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { Hub } from "../lib/hub/hub";
import { Tag } from "../lib/hub/types";
import { pullImage } from "../lib/hub/docker";

export default function SearchTags(props: { repo: string; hub?: Hub }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const search = useCallback((text: string) => {
    const abortCtrl = new AbortController();

    const fn = async () => {
      setLoading(true);
      try {
        let hub: Hub;
        if (props.hub) {
          hub = props.hub;
        } else {
          hub = new Hub();
        }
        const result = await hub.listTags(props.repo, text, abortCtrl.signal);
        setTags(result.results);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    };
    fn();
    return () => abortCtrl.abort();
  }, []);

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={loading} onSearchTextChange={search} throttle>
      {tags.map((tag) =>
        tag.images?.map((imageTag) => (
          <List.Item
            key={`${tag.id}-${imageTag.digest}`}
            title={tag.name}
            subtitle={tag.last_updated ? `${tag.last_updated} by ${tag.last_updater_username}` : ""}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Pull Command" content={`docker pull ${props.repo}:${tag.name}`} />
                <Action.CopyToClipboard title="Copy Name with Tag" content={`${props.repo}:${tag.name}`} />
                <Action.OpenInBrowser url={imageTag.url ?? ""} />
                <Action.CopyToClipboard title="Copy URL" content={imageTag.url ?? ""} />
                <Action
                  title="Pull Image"
                  onAction={() => pullImage(`${props.repo}:${tag.name}`)}
                  icon={Icon.Download}
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                />
              </ActionPanel>
            }
            accessories={[
              {
                text: `${imageTag.os_arch ?? ""} ${imageTag.sizeHuman ? imageTag.sizeHuman : ""}`,
              },
            ]}
          />
        )),
      )}
    </List>
  );
}
