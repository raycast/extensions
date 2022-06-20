import { Action, ActionPanel, Icon, LocalStorage } from "@raycast/api";
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
          await LocalStorage.setItem(LocalStorageKey.STAR_TEXT_FONT, font.value);
          setRefresh(Date.now());
          await decorateText(font.value);
        }}
      />
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
