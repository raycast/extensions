import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import {
  tagsTimeLeftFirst,
  getHourLeftThisDay,
  getLifeProgress,
  isBirthDay,
  LifeProgress,
  timeLeftFirstList,
  timeLeftLastList,
  tagsTimeLeftLast,
  getBirthDay,
} from "./utils/life-progress-utils";
import { buildBingImageURL, ShanBeiResponseData, WordOfTheDay } from "./utils/shanbei-utils";
import { isEmpty, preferences } from "./utils/common-utils";

export default function main() {
  const [lifeProgresses, setLifeProgresses] = useState<LifeProgress[]>([]);
  const [tag, setTag] = useState<string>("All");
  const [isEnglishWord, setIsEnglishWord] = useState<boolean>(true);
  const [cakeIndex, setCakeIndex] = useState<number>(0);
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay>({
    content: "",
    author: "",
    translation: "",
  });
  const { showDailyWord, timeLeftFirst } = preferences();

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
        <List.Dropdown tooltip={"You life progress"} storeValue={true} onChange={setTag}>
          {tagList.map((value) => {
            return <List.Dropdown.Item key={value} title={value} value={value} />;
          })}
        </List.Dropdown>
      }
    >
      {!getBirthDay().isValid ? (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title={"Invalid age detected"}
          description={"Go to preferences and correct"}
        />
      ) : (
        <>
          {isBirthDay() && (
            <List.Item
              icon={"🎉"}
              title={"🎉🎉🎉 Happy Birthday! Go find your birthday cake! 🎉🎉🎉"}
              actions={
                <ActionPanel>
                  {isBirthDay() && (
                    <Action
                      title={"Rummage Here"}
                      icon={"🎂"}
                      onAction={async () => {
                        await showToast(Toast.Style.Failure, "The 🎂 is not here.", "Try again somewhere else.");
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          )}
          {!isBirthDay() && showDailyWord && (
            <List.Item
              icon={{ source: isEnglishWord ? "word-icon.png" : "word-icon@chinese.png" }}
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
                </ActionPanel>
              }
            />
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
        </>
      )}
    </List>
  );
}

function LifeProgressListItem(props: { cakeIndex: number; index: number; lifeProgress: LifeProgress }) {
  const cakeIndex = props.cakeIndex;
  const index = props.index;
  const lifeProgress = props.lifeProgress;
  return (
    <List.Item
      icon={lifeProgress.icon}
      title={lifeProgress.title}
      accessories={lifeProgress.accessUnit}
      actions={
        <ActionPanel>
          {isBirthDay() && (
            <Action
              title={"Rummage Here"}
              icon={"🎂"}
              onAction={async () => {
                if (cakeIndex == index) {
                  await showToast(Toast.Style.Success, "You found the 🎂", "Enjoy it!");
                } else {
                  await showToast(Toast.Style.Failure, "The 🎂 is not here.", "Try again somewhere else.");
                }
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
