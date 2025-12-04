import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { type Card, getQuestions } from "./lib/api";

const preferences = getPreferenceValues<Preferences.SearchQuestions>();

function getQuestionIcon(card: Card): Icon {
  switch (card.display) {
    case "bar":
      return Icon.BarChart;
    case "table":
      return Icon.AppWindowGrid3x3;
    case "scalar":
      return Icon.Number99;
    case "line":
      return Icon.LineChart;
    case "pie":
      return Icon.PieChart;
    default:
      return Icon.QuestionMark;
  }
}

export default function SearchQuestions() {
  const { data: cards, isLoading } = useCachedPromise(getQuestions);

  return (
    <List searchBarPlaceholder="Search questions..." isLoading={isLoading}>
      {cards?.map((card) => (
        <List.Item
          key={card.id}
          icon={getQuestionIcon(card)}
          title={card.name}
          subtitle={card.description ?? ""}
          accessories={[
            card.creator ? { icon: getAvatarIcon(card.creator.common_name), text: card.creator.first_name } : null,
            { date: new Date(card.updated_at), tooltip: "Last Updated" },
          ].filter((x): x is { icon: Icon; text: string } => !!x)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={new URL(`/question/${card.id}`, preferences.instanceUrl).toString()} />
              <Action.CreateQuicklink
                quicklink={{
                  name: card.name,
                  link: new URL(`/question/${card.id}`, preferences.instanceUrl).toString(),
                  icon: getQuestionIcon(card),
                }}
              />
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy ID" content={card.id.toString()} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
