import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import formatTitle from "title";

export default function Command() {
  const [keyword, setKeyword] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const defaultTitle =
    "Enter your text on the search bar to get it capitalized properly according to The Chicago Manual of Style";

  useEffect(() => {
    const isEmptyKeyword = keyword === null || keyword.trim() === "";
    const nextTitle = isEmptyKeyword ? defaultTitle : formatTitle(keyword);
    setTitle(nextTitle);
  }, [keyword]);

  return (
    <List
      onSearchTextChange={setKeyword}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={title} />
          <Action.OpenInBrowser
            title="The Chicago Manual of Style"
            url="https://www.chicagomanualofstyle.org/home.html"
          />
        </ActionPanel>
      }
    >
      <List.EmptyView title="Capitalize Title" description={title} icon={Icon.Uppercase} />
    </List>
  );
}
