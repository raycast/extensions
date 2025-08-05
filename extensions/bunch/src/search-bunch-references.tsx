import { Action, ActionPanel, Clipboard, Icon, List, showHUD, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { EmptyView } from "./components/empty-view";
import { bunchReferences } from "./utils/bunch-reference";
import { ActionOpenSyntaxReference } from "./components/action-open-syntax-reference";

export default function SearchBunchReferences(props: { isPopup: boolean }) {
  const isPopup = typeof props.isPopup === "undefined" ? false : props.isPopup;
  const [filter, setFilter] = useState<string>("All");
  const { pop } = useNavigation();

  return (
    <List
      navigationTitle={isPopup ? "Quick Reference" : "Search Bunch References"}
      searchBarPlaceholder={"Search references"}
      searchBarAccessory={
        <List.Dropdown onChange={setFilter} tooltip={"Filter Tag"}>
          <List.Dropdown.Item key={"All"} title={"All"} value={"All"} />
          {bunchReferences.map((value) => {
            return <List.Dropdown.Item key={value.section} title={value.section} value={value.section} />;
          })}
        </List.Dropdown>
      }
    >
      <EmptyView title={"No Bunch Reference"} extensionPreferences={true} />

      {bunchReferences.map((value) => {
        return (
          (filter === value.section || filter === "All") && (
            <List.Section key={value.section} title={value.section}>
              {value.items.map((item, index) => {
                return (
                  <List.Item
                    key={index}
                    icon={"list-icon.svg"}
                    title={item.title}
                    subtitle={item.value}
                    keywords={[...item.value.split(" "), ...[item.value]]}
                    actions={
                      <ActionPanel>
                        <Action
                          icon={Icon.Clipboard}
                          title={"Copy Reference"}
                          onAction={async () => {
                            await Clipboard.copy(item.title);
                            if (isPopup) {
                              pop();
                            } else {
                              await showHUD("Reference copied to clipboard");
                            }
                          }}
                        />
                        <ActionOpenSyntaxReference />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )
        );
      })}
    </List>
  );
}
