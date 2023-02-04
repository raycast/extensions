import { List, ActionPanel, Action, Icon } from "@raycast/api";
import useInterval from "@use-it/interval";
import { useState } from "react";
import { useMessages } from "./messages";
import { Message, SearchType } from "./types";
import { extractCode } from "./utils";

const POLLING_INTERVAL = 1_000;

export default function Command() {
  const [searchType, setSearchType] = useState<SearchType>("code");
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, permissionView, revalidate } = useMessages({ searchText, searchType });

  useInterval(revalidate, POLLING_INTERVAL);

  if (permissionView) {
    return permissionView;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      searchBarAccessory={<SearchTypeDropdown onChange={setSearchType} />}
      isShowingDetail
      onSearchTextChange={setSearchText}
    >
      {data?.length ? (
        data.map((message) => {
          const code = extractCode(message.text);
          if (!code) {
            return null;
          }

          return (
            <List.Item
              key={message.guid}
              icon={Icon.Message}
              title={code}
              detail={<Detail message={message} code={code} />}
              actions={<Actions message={message} code={code} />}
            />
          );
        })
      ) : (
        <List.EmptyView title="No codes found" description="Keeps refreshing every second" />
      )}
    </List>
  );
}

function SearchTypeDropdown(props: { onChange: (searchType: SearchType) => void }) {
  return (
    <List.Dropdown tooltip="Filter search type" storeValue onChange={(value) => props.onChange(value as SearchType)}>
      <List.Dropdown.Item title="2FA Codes" value="code" />
      <List.Dropdown.Item title="All Messages" value="all" />
    </List.Dropdown>
  );
}

function Detail(props: { message: Message; code: string }) {
  return (
    <List.Item.Detail
      markdown={props.message.text}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Code" text={props.code} />
          <List.Item.Detail.Metadata.Label title="From" text={props.message.sender} />
          <List.Item.Detail.Metadata.Label title="Date" text={new Date(props.message.message_date).toLocaleString()} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function Actions(props: { message: Message; code: string }) {
  return (
    <ActionPanel title="Action">
      <ActionPanel.Section>
        <Action.Paste content={props.code} title="Paste Code" />
        <Action.CopyToClipboard content={props.code} title="Copy Code" />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          content={props.message.text}
          title="Copy Message"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          content={props.code + "\t" + props.message.text}
          title="Copy Code and Message"
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
