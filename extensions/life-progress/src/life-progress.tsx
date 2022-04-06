import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import fetch, { AbortError } from "node-fetch";
import { allTags, getHourLeftThisDay, getLifeProgress, isBirthDay, LifeProgress } from "./life-progress-utils";
import { buildBingImageURL, ShanBeiResponseData, WordOfTheDay } from "./shanbei-utils";
import { isEmpty } from "./common-utils";

export default function main() {
  const [lifeProgresses, setLifeProgresses] = useState<LifeProgress[]>([]);
  const [tag, setTag] = useState<string>("All");
  const [refreshList, setRefreshList] = useState<boolean>(true);
  const [isEnglishWord, setIsEnglishWord] = useState<boolean>(true);
  const [cakeIndex, setCakeIndex] = useState<number>(0);
  const [wordOfTheDay, setWordOfTheDay] = useState<WordOfTheDay>({
    content: "",
    author: "",
    translation: "",
  });

  useEffect(() => {
    async function _fetchLifeProgress() {
      const { lifeProgresses, cakeIndex } = getLifeProgress();
      setLifeProgresses(lifeProgresses);
      setCakeIndex(cakeIndex);
    }

    _fetchLifeProgress().then();
  }, [refreshList]);

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
  }, [refreshList]);

  return (
    <List
      isLoading={lifeProgresses.length === 0}
      searchBarPlaceholder={`${getHourLeftThisDay() <= 12 ? "Don't miss the past" : "Don't worry about the future"}, ${
        isBirthDay() ? "celebrate your birthday" : "cherish the present"
      }`}
      searchBarAccessory={
        <List.Dropdown tooltip={"You life progress"} storeValue={true} onChange={setTag}>
          {allTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      {isBirthDay() && (
        <List.Item
          icon={"🎉"}
          title={"🎉🎉🎉 Happy Birthday! Go find your birthday cake! 🎉🎉🎉"}
          actions={
            <ActionPanel>
              <Action
                title={"Hide 🎂"}
                icon={"🎂"}
                onAction={() => {
                  setRefreshList(!refreshList);
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {!isBirthDay() && (
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

      {(tag === allTags[0].value || tag === allTags[1].value) && (
        <List.Section title="You have">
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === "Have done" && (
                <LifeProgressListItem
                  key={index}
                  index={index}
                  cakeIndex={cakeIndex}
                  lifeProgress={lifeProgress}
                  refreshListUseState={[refreshList, setRefreshList]}
                />
              )
            );
          })}
        </List.Section>
      )}
      {(tag === allTags[0].value || tag === allTags[2].value) && (
        <List.Section title="You may be able to">
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === "Able to" && (
                <LifeProgressListItem
                  key={index}
                  index={index}
                  cakeIndex={cakeIndex}
                  lifeProgress={lifeProgress}
                  refreshListUseState={[refreshList, setRefreshList]}
                />
              )
            );
          })}
        </List.Section>
      )}
      {(tag === allTags[0].value || tag === allTags[3].value) && (
        <List.Section title="Time left">
          {lifeProgresses.map((lifeProgress, index) => {
            return (
              lifeProgress.section === "Time left" && (
                <LifeProgressListItem
                  key={index}
                  index={index}
                  cakeIndex={cakeIndex}
                  lifeProgress={lifeProgress}
                  refreshListUseState={[refreshList, setRefreshList]}
                />
              )
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function LifeProgressListItem(props: {
  cakeIndex: number;
  index: number;
  lifeProgress: LifeProgress;
  refreshListUseState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}) {
  const cakeIndex = props.cakeIndex;
  const index = props.index;
  const lifeProgress = props.lifeProgress;
  const [refreshList, setRefreshList] = props.refreshListUseState;
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
                  await showToast(Toast.Style.Success, "Find the 🎂, enjoy it!");
                  setRefreshList(!refreshList);
                } else {
                  await showToast(Toast.Style.Failure, "🎂 is not here.");
                }
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
