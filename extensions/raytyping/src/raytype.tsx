import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { calculateAccuracy } from "./utils";
import { useGame } from "./hooks";

export default function Main() {
  const {
    isFinish,
    typedText,
    setTypedText,
    speed,
    test,
    content,
    failedCount,
    isCorrect,
    reloadGame,
    inProgress,
    testLength,
    setTestLength,
  } = useGame();

  return (
    <List
      searchText={typedText}
      isLoading={inProgress}
      isShowingDetail={true}
      searchBarPlaceholder="Type here"
      onSearchTextChange={(value) => setTypedText(value)}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Word Amount"
          defaultValue={testLength}
          onChange={setTestLength}
          filtering={false}
          storeValue={true}
        >
          <List.Dropdown.Item title="10 words" value="10" />
          <List.Dropdown.Item title="25 words" value="25" />
          <List.Dropdown.Item title="50 words" value="50" />
          <List.Dropdown.Item title="100 words" value="100" />
        </List.Dropdown>
      }
    >
      <List.Item
        icon={{
          source: Icon.Stopwatch,
          tintColor: isCorrect ? Color.Green : Color.Red,
        }}
        title={`${speed} wpm`}
        actions={
          <ActionPanel>
            <Action title="Reload" onAction={() => reloadGame()} icon={Icon.Bolt} />
          </ActionPanel>
        }
        detail={
          <List.Item.Detail
            markdown={content}
            metadata={
              isFinish ? (
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Speed" text={{ color: Color.Green, value: `${speed} wpm` }} />
                  <List.Item.Detail.Metadata.Label
                    title="Accuracy"
                    text={{ color: Color.Red, value: `${calculateAccuracy(test, failedCount)} %` }}
                  />
                </List.Item.Detail.Metadata>
              ) : null
            }
          />
        }
      />
    </List>
  );
}
