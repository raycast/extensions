import { Action, Icon, LocalStorage } from "@raycast/api";
import AddCountdownDate from "../add-countdown-date";
import React, { Dispatch, SetStateAction } from "react";
import { CountdownDate } from "../types/types";
import { alertDialog } from "../hooks/hooks";
import { LocalStorageKey } from "../utils/constants";

export function ActionAddCountdownDate(props: {
  countdownDates: CountdownDate[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { countdownDates, setRefresh } = props;
  return (
    <Action.Push
      icon={Icon.Clock}
      title={"Add Countdown Date"}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      target={<AddCountdownDate countdownDates={countdownDates} setRefresh={setRefresh} />}
    />
  );
}

export function ActionRemoveCountdownDate(props: {
  countdownDates: CountdownDate[];
  setRefresh: Dispatch<SetStateAction<number>>;
  lifeProgressesLength: number;
  index: number;
}) {
  const { countdownDates, setRefresh, lifeProgressesLength, index } = props;
  return (
    <Action
      icon={Icon.Trash}
      title={"Remove Countdown Date"}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        await alertDialog(
          Icon.Trash,
          "Remove CountDown Date",
          "Are you sure you want to remove countdown date?",
          "Remove",
          () => {
            const _cd = [...countdownDates];
            _cd.splice(countdownDates.length - lifeProgressesLength + index, 1);
            LocalStorage.setItem(LocalStorageKey.COUNTDOWN_DATE_KEY, JSON.stringify(_cd));
            setRefresh(Date.now());
          },
        );
      }}
    />
  );
}
