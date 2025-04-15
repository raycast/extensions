import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { getFavicon, getProgressIcon, useFrecencySorting } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getJsonFormatFromStore } from "./helpers";
import { JsonFormat } from "./helpers/types";

// Ente colors - purple #A400B6, orange #FF9800
const getProgressColor = (remainingTime: number) => {
  return remainingTime > 10 ? "#A400B6" : "#FF9800";
};

const RERENDER_INTERVAL = 1000;

export default function Command() {
  const [secrets, setSecrets] = useState<JsonFormat[]>([]);
  const { visitItem, resetRanking } = useFrecencySorting<JsonFormat>(secrets, {
    key: (item) => item.service_name,
  });

  useEffect(() => {
    if (secrets.length === 0) {
      getJsonFormatFromStore().then((data) => setSecrets(data));
    }

    /**
     * Set up an interval to re-fetch the data from the store every second.
     * This is necessary because the data in the store can change at any time.
     */
    const interval = setInterval(() => {
      getJsonFormatFromStore().then((data) => setSecrets(data));
    }, RERENDER_INTERVAL);

    return () => {
      setSecrets([]);
      clearInterval(interval);
    };
  }, []);

  if (secrets.length === 0) {
    return (
      <List>
        <List.Item title={"No Secrets found"} />
      </List>
    );
  }

  const Metadata = List.Item.Detail.Metadata;
  const Label = Metadata.Label;
  const Separator = Metadata.Separator;

  const PreferredAction = getPreferenceValues().action;

  return (
    <List navigationTitle="Get TOTP" searchBarPlaceholder="Search..." isShowingDetail>
      {secrets.map((item, index) => {
        const userActions = [
          <Action.CopyToClipboard
            key="copy"
            title="Copy Current"
            icon={Icon.Key}
            content={item.current_totp}
            onCopy={() => visitItem(item)}
          />,
          <Action.Paste
            key="paste"
            title="Paste Current"
            icon={Icon.Key}
            content={item.current_totp}
            onPaste={() => visitItem(item)}
          />,
        ];

        return (
          <List.Item
            key={index}
            title={item.service_name}
            subtitle={item.username}
            icon={item.notes && /^https?:\/\//.test(item.notes) ? getFavicon(item.notes) : Icon.Key}
            keywords={[item.service_name, item.username ?? "", ...item.tags]}
            detail={
              <>
                <List.Item.Detail markdown={`#${item.current_totp_time_remaining}s`} />
                <List.Item.Detail
                  metadata={
                    <Metadata>
                      <Label title="Current" text={item.current_totp} />
                      <Label title="Next" text={item.next_totp} />
                      <Separator />
                      <Label title="Username" text={item.username} />
                      <Label title="Algorithm" text={item.algorithm} />
                      <Label title="Digits" text={item.digits.toString()} />
                      <Label title="Period" text={item.period} />
                      <Separator />
                      <Metadata.Link title="Notes" target={item.notes} text={item.notes} />
                      <Separator />
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {item.tags.map((tag, index) => (
                          <List.Item.Detail.Metadata.TagList.Item key={index} text={tag} color={"#A400B6"} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </Metadata>
                  }
                />
              </>
            }
            accessories={[
              {
                icon: {
                  source: getProgressIcon(item.current_totp_time_remaining / 30),
                  tintColor: getProgressColor(item.current_totp_time_remaining),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Current">
                  {PreferredAction === "copy" ? userActions : userActions.toReversed()}
                </ActionPanel.Section>
                <ActionPanel.Section title="Next">
                  <Action.CopyToClipboard
                    title="Copy Next"
                    icon={Icon.Key}
                    content={item.next_totp}
                    onCopy={() => visitItem(item)}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(item)} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
