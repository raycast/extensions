import { useState } from "react";
import { List, ActionPanel, Action, getPreferenceValues } from "@raycast/api";
import { DocumentationDetails } from "@/components/documentation-details";
import { getDocUrl } from "@/utils";
import DOCS from "@/documentation/menu.json";

import type { Doc } from "@/type";

export default function Command() {
  const [docs] = useState<Doc[]>(DOCS as unknown as Doc[]);

  const { preferredAction } = getPreferenceValues<Preferences.Index>();

  return (
    <List>
      {docs.map((item, index) => (
        <List.Item
          key={index}
          icon="es6-icon.png"
          title={item.title}
          actions={
            <ActionPanel>
              {[
                <Action.Push key="read" title="Read Documentation" target={<DocumentationDetails doc={item} />} />,
                <Action.OpenInBrowser key="open" url={getDocUrl(item)} />,
              ].sort((a) => (a.key === preferredAction ? -1 : 1))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
