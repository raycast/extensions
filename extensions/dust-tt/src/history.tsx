import { Action, ActionPanel, getPreferenceValues, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DustAPICredentials } from "./dust_api/api";

export interface DustHistory {
  conversationId: string;
  question: string;
  answer: string;
  date: Date;
  agent: string;
}

export async function getDustHistory(): Promise<DustHistory[]> {
  const history = await LocalStorage.getItem<string>("dust_history");
  if (!history) {
    return [];
  }
  const parsed_history = JSON.parse(history) as DustHistory[];
  return parsed_history.map((h) => {
    return { ...h, date: new Date(h.date) };
  });
}

export async function addDustHistory(history: DustHistory) {
  const historyList = await getDustHistory();
  historyList.push(history);
  await LocalStorage.setItem("dust_history", JSON.stringify(historyList));
}

export default function DustHistoryCommand() {
  const [history, setHistory] = useState<DustHistory[] | null>(null);
  const preferences = getPreferenceValues<DustAPICredentials>();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function history() {
      try {
        const history = await getDustHistory();
        setHistory(history);
      } catch (error) {
        await showToast(Toast.Style.Failure, "Could not get history");
      }
    }
    history();
  }, []);

  const dustAssistantUrl = `https://dust.tt/w/${preferences.workspaceId}/assistant`;

  return (
    <List isLoading={history === null} isShowingDetail={showDetails}>
      {history && history.length > 0 ? (
        history
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .map((item) => (
            <List.Item
              key={item.question + item.date.getTime()}
              title={item.question}
              accessories={showDetails ? [] : [{ tag: item.agent || "Dust" }, { date: item.date }]}
              detail={
                <List.Item.Detail
                  markdown={`### ${format(item.date, "yyyy-MM-dd HH:mm")} - ${item.agent}\n\n ### ${(item.question
                    .length > 50
                    ? item.question.slice(0, 50) + "..."
                    : item.question
                  ).replaceAll("\n", " ")} \n\n ${item.answer}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Details"
                    icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
                    onAction={() => setShowDetails(!showDetails)}
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    title="Continue on Dust"
                    url={`${dustAssistantUrl}/${item.conversationId}`}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  <Action
                    title="Remove"
                    shortcut={{ modifiers: [], key: "backspace" }}
                    icon={Icon.DeleteDocument}
                    onAction={async () => {
                      const newHistory = history.filter((h) => h.conversationId !== item.conversationId);
                      await LocalStorage.setItem("dust_history", JSON.stringify(newHistory));
                      setHistory(newHistory);
                    }}
                  />
                  <Action
                    icon={Icon.Trash}
                    title="Clear All History"
                    onAction={async () => {
                      await LocalStorage.setItem("dust_history", JSON.stringify([]));
                      setHistory([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
      ) : (
        <List.EmptyView icon={Icon.BulletPoints} title="No Dust history yet" />
      )}
    </List>
  );
}
