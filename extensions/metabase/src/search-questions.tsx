import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getAvatarIcon, useFetch } from "@raycast/utils";

const preferences = getPreferenceValues<Preferences.SearchQuestions>();

interface Card {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
  view_count: number;
  display: "bar" | "table" | "scalar" | "line" | "pie" | (string & Record<string, never>);
  creator: {
    email: string;
    first_name: string;
    last_login: string;
    is_qbnewb: boolean;
    is_superuser: boolean;
    id: number;
    last_name: string;
    date_joined: string;
    common_name: string;
  };
}

const endpoint = new URL("/api/card", preferences.instanceUrl);

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
  const { data: cards, isLoading } = useFetch<Card[]>(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": preferences.apiToken,
    },
  });

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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
