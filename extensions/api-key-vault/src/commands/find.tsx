import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { findMatches, MatchResult } from "../lib/search";
import { getSecret, listRecords } from "../lib/storage";

export default function FindCommand() {
  const [query, setQuery] = useState("");

  const {
    data: records,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      return await listRecords();
    },
    [],
    { keepPreviousData: true },
  );

  const matches = useMemo(() => {
    return findMatches(records ?? [], query);
  }, [records, query]);

  async function copyApiKey(id: string, keyName: string) {
    const secret = await getSecret(id);
    if (!secret) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key not found",
        message: keyName,
      });
      return;
    }
    await Clipboard.copy(secret);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied API key",
      message: keyName,
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by key name, application, service, #tag, or tag:foo"
      onSearchTextChange={setQuery}
      throttle
    >
      {matches.map((m: MatchResult) => {
        const kindText = m.kinds.length ? m.kinds.join(", ") : "";
        const subtitle = [m.record.application, m.record.service]
          .filter(Boolean)
          .join(" · ");
        const tagText = m.record.tags.length ? m.record.tags.join(", ") : "";

        return (
          <List.Item
            key={m.record.id}
            title={m.record.keyName}
            subtitle={subtitle}
            accessories={[
              ...(kindText ? [{ text: kindText }] : []),
              ...(tagText ? [{ tag: { value: tagText } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy API Key"
                  onAction={() => copyApiKey(m.record.id, m.record.keyName)}
                />
                <Action title="Refresh" onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
