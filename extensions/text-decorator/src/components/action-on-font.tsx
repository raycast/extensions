import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { decorateText } from "../decorate-text";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { DecorationFont } from "../types/types";

export function ActionOnFont(props: {
  layout: string;
  showDetail: boolean;
  font: DecorationFont;
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { layout, showDetail, font, setRefresh } = props;
  return (
    <ActionPanel>
      <Action
        icon={Icon.TextInput}
        title={"Decorate Text"}
        onAction={async () => {
          await decorateText(font.value);
        }}
      />
      {layout === "List" && (
        <ActionPanel.Section>
          <Action
            icon={Icon.Sidebar}
            title={"Toggle Details"}
            shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
            onAction={async () => {
              await LocalStorage.setItem(LocalStorageKey.DETAIL_KEY, JSON.stringify(!showDetail));
              setRefresh(Date.now());
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
