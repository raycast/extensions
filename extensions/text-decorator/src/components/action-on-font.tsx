import { Action, ActionPanel, Icon, LocalStorage, showHUD } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { decorateText } from "../decorate-text";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { DecorationFont } from "../types/types";

export function ActionOnFont(props: { font: DecorationFont; setRefresh: Dispatch<SetStateAction<number>> }) {
  const { font, setRefresh } = props;
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
          await showHUD("Default font of 𝐃𝐞𝐜𝐨𝐫𝐚𝐭𝐞 𝐓𝐞𝐱𝐭 command set to " + font.title);
        }}
      />
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
