import { ActionPanel, List, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { Docset, getDocsetIconPath, getDocsets } from "./util/docsets";
import DocsetSearch from "./DocsetSearch";

export default function DocSetList() {
  const [docsets, setDocsets] = useState<Docset[]>([]);

  useEffect(() => {
    getDocsets().then(setDocsets);
  }, []);

  return (
    <List isLoading={docsets.length === 0} searchBarPlaceholder="Filter docsets by name...">
      {docsets.map((docset) => (
        <DocsetListItem key={docset.docsetBundle} docset={docset} />
      ))}
    </List>
  );
}

function DocsetListItem({ docset }: { docset: Docset }) {
  const { push } = useNavigation();

  return (
    <List.Item
      title={docset.docsetName}
      subtitle={docset.docsetBundle}
      icon={getDocsetIconPath(docset)}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Open" onAction={() => push(<DocsetSearch docset={docset} />)} />
        </ActionPanel>
      }
    />
  );
}
