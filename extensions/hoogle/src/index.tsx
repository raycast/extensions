import { useState } from "react";
import { ActionPanel, Icon, List, Color, Action } from "@raycast/api";
import { useHoogle, Result } from "./hoogle";
import { htmlToMarkdown, htmlToText } from "./markdown";

const titleAndSubtitle = (item: Result): [string, string?] => {
  const text = htmlToText(item.item);

  if (item.type == "package" || item.type == "module") {
    return [text];
  }

  const parts = text.split(" ");

  if (parts[1] == "::") {
    return [parts[0], parts.slice(1).join(" ")];
  }

  return [text];
};

const hoogleIcon = (item: Result) => {
  switch (item.type) {
    case "package":
      return Icon.Box;

    case "module":
      return Icon.BlankDocument;

    default:
      return Icon.Hashtag;
  }
};

function Detail(item: Result) {
  return <List.Item.Detail markdown={htmlToMarkdown(item.docs)} />;
}

function Accessories(item: Result) {
  const accessories = [];
  if (item.package.name) {
    accessories.push({ text: { value: item.package.name } });
  }

  if (item.module.name) {
    accessories.push({ text: { value: item.module.name, color: Color.Orange } });
  }
  return accessories;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useHoogle(searchText);
  const [showDetail, setShowDetail] = useState(false);
  const items = data || [];

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      isShowingDetail={showDetail && items.length > 0}
      throttle={true}
    >
      {items.map((item, index) => {
        const [title, subTitle] = titleAndSubtitle(item);
        const icon = hoogleIcon(item);

        return (
          <List.Item
            key={`${searchText}-${index}`}
            title={title}
            subtitle={subTitle}
            icon={icon}
            detail={Detail(item)}
            accessories={showDetail ? null : Accessories(item)}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action
                  title="Toggle Documentation"
                  icon={Icon.Document}
                  shortcut={{ key: "d", modifiers: ["cmd", "shift"] }}
                  onAction={() => setShowDetail(!showDetail)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
