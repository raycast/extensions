import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { calculateAccuracy } from "./utils";
import { useGame } from "./hooks";

export default function Main() {
  const { isFinish, typedText, setTypedText, speed, test, content, failedCount, isCorrect, reloadGame, inProgress } =
    useGame();

  return (
    <List
      searchText={isFinish ? "Reload to continue" : typedText}
      isLoading={inProgress}
      isShowingDetail={true}
      searchBarPlaceholder="Type here"
      onSearchTextChange={(value) => (isFinish ? () => null : setTypedText(value))}
    >
      <List.Item
        icon={{
          source: Icon.Stopwatch,
          tintColor: isCorrect ? Color.Green : Color.Red,
        }}
        title={`${speed} wpm`}
        actions={
          <ActionPanel>
            <Action title="Reload" onAction={() => reloadGame()} />
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
