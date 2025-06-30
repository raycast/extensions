import { SingleDocsetSearch } from "./views";
import { Docset } from "./types";
import { useDocsets } from "./hooks";
import { ActionPanel, List } from "@raycast/api";
import { getDocsetByKeyword } from "./utils";
import OpenInBrowserAction from "./components/OpenInBrowserAction";
import { useEffect, useState } from "react";

export default function Command(props: { arguments: { docset: string } }) {
  const { docset } = props.arguments;
  const [docsets, isLoadingDocsets] = useDocsets();
  const [matchedDocset, setMatchedDocset] = useState<Docset | undefined>();

  useEffect(() => {
    setMatchedDocset(getDocsetByKeyword(docsets, docset || ""));
  }, [docsets, docset]);

  if (!docset || !matchedDocset || isLoadingDocsets) {
    return (
      <List isLoading={isLoadingDocsets}>
        <List.EmptyView
          title={`${docset} docset not found`}
          description={`You need to set a keyword for the docset in Dash app to use this command`}
          icon="empty-view-icon.png"
          actions={
            <ActionPanel>
              <OpenInBrowserAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <SingleDocsetSearch docset={matchedDocset} />;
}
