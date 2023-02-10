import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { isEmpty } from "../utils/common-utils";
import { ActionOpenPreferences } from "./action-open-preferences";
import React, { Dispatch, SetStateAction } from "react";
import { WordOfTheDay } from "../utils/shanbei-utils";
import { CountdownDate } from "../types/types";
import { ActionAddCountdownDate } from "./action-countdown-date";

export function WordOfTheDayItem(props: {
  isEnglishWord: boolean;
  setIsEnglishWord: Dispatch<SetStateAction<boolean>>;
  wordOfTheDay: WordOfTheDay;
  countdownDates: CountdownDate[];
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { isEnglishWord, setIsEnglishWord, wordOfTheDay, countdownDates, setRefresh } = props;
  return (
    <List.Item
      icon={{
        source: isEnglishWord
          ? { light: "word-icon.png", dark: "word-icon@dark.png" }
          : { light: "word-icon@chinese.png", dark: "word-icon@chinese@dark.png" },
      }}
      title={isEnglishWord ? wordOfTheDay.content : wordOfTheDay.translation}
      accessories={[{ text: isEmpty(wordOfTheDay.author) ? " " : wordOfTheDay.author }]}
      actions={
        <ActionPanel>
          <Action
            title={"Translate Word"}
            icon={Icon.TwoArrowsClockwise}
            onAction={() => {
              setIsEnglishWord(!isEnglishWord);
            }}
          />
          <Action
            title={"Copy Word"}
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(isEnglishWord ? wordOfTheDay.content : wordOfTheDay.translation);
              await showToast(Toast.Style.Success, "Copy word success!");
            }}
          />
          <ActionAddCountdownDate countdownDates={countdownDates} setRefresh={setRefresh} />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
