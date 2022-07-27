import { getPreferenceValues, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { getBirthDay, getHourLeftThisDay, isBirthDay } from "./utils/life-progress-utils";
import { LifeProgressListItem } from "./components/life-progress-list-item";
import { Preferences } from "./types/preferences";
import { WordOfTheDayItem } from "./components/word-of-the-day-item";
import { LifeProgressCanvasItem } from "./components/life-progress-canvas-item";
import { BirthdayItem } from "./components/birthday-item";
import { tagsTimeLeftFirst, tagsTimeLeftLast, timeLeftFirstList, timeLeftLastList } from "./utils/constants";
import { getLifeProgressInfo, getWordOfTheDay } from "./hooks/hooks";

export default function LifeProgress() {
  const { showDailyWord, showProgressBar, countdownDateFirst } = getPreferenceValues<Preferences>();
  const [tag, setTag] = useState<string>("All");
  const [isEnglishWord, setIsEnglishWord] = useState<boolean>(true);
  const [refresh, setRefresh] = useState<number>(0);

  const { wordOfTheDay } = getWordOfTheDay();
  const { lifeProgresses, countDownDates, cakeIndex, loading } = getLifeProgressInfo(refresh);

  const sectionList = countdownDateFirst ? timeLeftFirstList : timeLeftLastList;
  const tagList = countdownDateFirst ? tagsTimeLeftFirst : tagsTimeLeftLast;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`${getHourLeftThisDay() <= 12 ? "Don't miss the past" : "Don't worry about the future"}, ${
        isBirthDay() ? "celebrate your birthday" : "cherish the present"
      }`}
      searchBarAccessory={
        <List.Dropdown tooltip={"Your life progress"} storeValue={true} onChange={setTag}>
          {tagList.map((value) => {
            return <List.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Clock}
        title={"Cherish the present"}
        description={"Everything is gone, but time is always on"}
      />

      {getBirthDay().isValid && isBirthDay() && (
        <BirthdayItem countdownDates={countDownDates} setRefresh={setRefresh} />
      )}

      {!isBirthDay() && (
        <>
          {showDailyWord && (
            <WordOfTheDayItem
              wordOfTheDay={wordOfTheDay}
              isEnglishWord={isEnglishWord}
              setIsEnglishWord={setIsEnglishWord}
              countdownDates={countDownDates}
              setRefresh={setRefresh}
            />
          )}
          {showProgressBar && <LifeProgressCanvasItem countdownDates={countDownDates} setRefresh={setRefresh} />}
        </>
      )}

      {(tag === tagList[0] || tag === tagList[1]) && (
        <List.Section title={sectionList[0]}>
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === sectionList[0] && (
                <LifeProgressListItem
                  key={index}
                  index={index}
                  lifeProgressesLength={lifeProgresses.length}
                  cakeIndex={cakeIndex}
                  lifeProgress={lifeProgress}
                  countdownDates={countDownDates}
                  setRefresh={setRefresh}
                />
              )
            );
          })}
        </List.Section>
      )}
      {(tag === tagList[0] || tag === tagList[2]) && (
        <List.Section title={sectionList[1]}>
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === sectionList[1] && (
                <LifeProgressListItem
                  key={index}
                  index={index}
                  lifeProgressesLength={lifeProgresses.length}
                  cakeIndex={cakeIndex}
                  lifeProgress={lifeProgress}
                  countdownDates={countDownDates}
                  setRefresh={setRefresh}
                />
              )
            );
          })}
        </List.Section>
      )}
      {(tag === tagList[0] || tag === tagList[3]) && (
        <List.Section title={sectionList[2]}>
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === sectionList[2] && (
                <LifeProgressListItem
                  key={index}
                  index={index}
                  lifeProgressesLength={lifeProgresses.length}
                  cakeIndex={cakeIndex}
                  lifeProgress={lifeProgress}
                  countdownDates={countDownDates}
                  setRefresh={setRefresh}
                />
              )
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
