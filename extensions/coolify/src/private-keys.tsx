import { Action, ActionPanel, Icon, List } from "@raycast/api";
import InvalidUrl from "./lib/components/invalid-url";
import { PrivateKey } from "./lib/types";
import useCoolify from "./lib/use-coolify";
import { isValidCoolifyUrl } from "./lib/utils";
import { useState } from "react";

export default function PrivateKeys() {
  if (!isValidCoolifyUrl()) return <InvalidUrl />;

  const { isLoading, data: keys = [] } = useCoolify<PrivateKey[]>("security/keys");

  const [isShowingDetail, setIsShowingDetail] = useState(false);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search keys" isShowingDetail={isShowingDetail}>
      <List.Section title="Private Keys" subtitle={`${keys.length} keys`}>
        {keys.map((key) => (
          <List.Item
            key={key.id}
            icon={Icon.Key}
            title={key.name}
            subtitle={isShowingDetail ? undefined : key.description}
            detail={<List.Item.Detail markdown={key.private_key} />}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Private Key"
                  onAction={() => setIsShowingDetail((prev) => !prev)}
                />
                <Action.CopyToClipboard title="Copy Private Key to Clipboard" content={key.private_key} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
