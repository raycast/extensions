// SPDX-FileCopyrightText: 2026 dtwinuz and bitg contributors
//
// SPDX-License-Identifier: MIT OR Apache-2.0

import { Action, ActionPanel, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";

import { Target } from "./core";
import { loadCore, preferenceFlags } from "./engine";

const TARGETS: { target: Target; title: string }[] = [
  { target: "new", title: "New Latin (2026)" },
  { target: "old-official", title: "Old Latin (oʻ gʻ)" },
  { target: "old-ascii", title: "Old Latin (o' g')" },
  { target: "cyrillic", title: "Cyrillic" },
];

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!|>~<])/g, "\\$1").replace(/\n/g, "  \n");
}

export default function Command() {
  const [text, setText] = useState("");
  const { data: core, isLoading } = usePromise(loadCore, [], {
    onError: (error) => showFailureToast(error, { title: "Could not load the bitg engine" }),
  });

  return (
    <List
      isLoading={isLoading}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Type or paste Uzbek text"
      isShowingDetail={text.length > 0}
    >
      {text && core ? (
        TARGETS.map(({ target, title }) => {
          const out = core.convert(text, target, target === "new" ? preferenceFlags() : 0);
          return (
            <List.Item
              key={target}
              title={title}
              detail={<List.Item.Detail markdown={escapeMarkdown(out)} />}
              actions={
                <ActionPanel>
                  <Action.Paste content={out} />
                  <Action.CopyToClipboard content={out} />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView
          icon="icon.png"
          title="Type or paste Uzbek text"
          description="Old Latin and Cyrillic are converted to the 2026 alphabet (ö ğ ş ç). English words are kept."
        />
      )}
    </List>
  );
}
