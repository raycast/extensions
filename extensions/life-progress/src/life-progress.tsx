import { getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { getBirthDay, getHourLeftThisDay, getLifeProgress, isBirthDay } from "./utils/life-progress-utils";
import { buildBingImageURL, ShanBeiResponseData, WordOfTheDay } from "./utils/shanbei-utils";
import { LifeProgressListItem } from "./components/life-progress-list-item";
import { LifeProgress } from "./types/types";
import { Preferences } from "./types/preferences";
import { WordOfTheDayItem } from "./components/word-of-the-day-item";
import { LifeProgressCanvasItem } from "./components/life-progress-canvas-item";
import { BirthdayItem } from "./components/birthday-item";
import { tagsTimeLeftFirst, tagsTimeLeftLast, timeLeftFirstList, timeLeftLastList } from "./utils/constants";

export default function main() {
  const { showDailyWord, showProgressBar, timeLeftFirst } = getPreferenceValues<Preferences>();
  const [lifeProgresses, setLifeProgresses] = useState<LifeProgress[]>([]);
  const [tag, setTag] = useState<string>("All");
  const [isEnglishWord, setIsEnglishWord] = useState<boolean>(true);
  const [cakeIndex, setCakeIndex] = useState<number>(0);
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay>({
    content: "",
    author: "",
    translation: "",
  });

  const sectionList = timeLeftFirst ? timeLeftFirstList : timeLeftLastList;
  const tagList = timeLeftFirst ? tagsTimeLeftFirst : tagsTimeLeftLast;

  useEffect(() => {
    async function _fetchLifeProgress() {
      const { lifeProgresses, cakeIndex } = getLifeProgress();
      setLifeProgresses(lifeProgresses);
      setCakeIndex(cakeIndex);
    }

    _fetchLifeProgress().then();
  }, []);

  useEffect(() => {
    async function _fetchLifeProgress() {
      try {
        fetch(buildBingImageURL())
          .then((res) => res.json())
          .then((data) => {
            const shanBeiResponseData = data as ShanBeiResponseData;
            setWordOfTheDay({
              content: shanBeiResponseData.content,
              author: shanBeiResponseData.author,
              translation: shanBeiResponseData.translation,
            });
          });
      } catch (e) {
        if (e instanceof AbortError) {
          return;
        }
        await showToast(Toast.Style.Failure, String(e));
      }
    }

    _fetchLifeProgress().then();
  }, []);

  return (
    <List
      isLoading={lifeProgresses.length === 0}
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

      {getBirthDay().isValid && isBirthDay() && <BirthdayItem />}

      {!isBirthDay() && (
        <>
          {showDailyWord && (
            <WordOfTheDayItem
              wordOfTheDay={wordOfTheDay}
              isEnglishWord={isEnglishWord}
              setIsEnglishWord={setIsEnglishWord}
            />
          )}
          {showProgressBar && <LifeProgressCanvasItem />}
        </>
      )}

      {(tag === tagList[0] || tag === tagList[1]) && (
        <List.Section title={sectionList[0]}>
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === sectionList[0] && (
                <LifeProgressListItem key={index} index={index} cakeIndex={cakeIndex} lifeProgress={lifeProgress} />
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
                <LifeProgressListItem key={index} index={index} cakeIndex={cakeIndex} lifeProgress={lifeProgress} />
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
                <LifeProgressListItem key={index} index={index} cakeIndex={cakeIndex} lifeProgress={lifeProgress} />
              )
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
