import { Action, ActionPanel, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { decorateText } from "../decorate-text";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { DecorationFont } from "../types/types";
import Style = Toast.Style;

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
        icon={Icon.Pencil}
        title={"Decorate Text"}
        onAction={async () => {
          await decorateText(font.value);
        }}
      />
      <Action
        icon={Icon.Star}
        title={"Set Default Font"}
        onAction={async () => {
          await LocalStorage.setItem(LocalStorageKey.STAR_TEXT_FONT, font.value);
          setRefresh(Date.now());
          await showToast(Style.Success, font.title, "Default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command set to " + font.title);
        }}
      />
      {layout === "List" && (
        <ActionPanel.Section>
          <Action
            icon={Icon.Sidebar}
            title={"Toggle Details"}
            shortcut={{ modifiers: ["shift", "ctrl"], key: "d" }}
            onAction={async () => {
              await LocalStorage.setItem(LocalStorageKey.DETAIL_KEY, !showDetail);
              setRefresh(Date.now());
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
