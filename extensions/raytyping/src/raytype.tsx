import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { calculateAccuracy } from "./utils";
import { useGame } from "./hooks";

export default function Main() {
  const { isFinish, typedText, setTypedText, speed, test, content, failedCount, isCorrect, reloadGame } = useGame();

  return (
    <List
      searchText={isFinish ? "Reload to continue" : typedText}
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
            <Action title="Reload new game" onAction={() => reloadGame()} shortcut={{ modifiers: ["cmd"], key: "n" }} />
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
