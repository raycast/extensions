import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  buildBetaSeriesUrl,
  getHeaders,
  markEpisodeAsWatched,
  parseBetaSeriesResponse,
} from "./api/client";
import { MemberPlanning } from "./types/betaseries";
import { TokenRequiredView } from "./components/TokenRequiredView";
import { useAuthToken } from "./hooks/useAuthToken";

interface PlanningItem {
  date?: string;
  id?: number;
  episode_id?: number;
  show?: {
    id?: number;
    title?: string;
  };
  show_id?: number;
  show_title?: string;
  season?: number;
  episode?: number;
  title?: string;
  code?: string;
}

function isUpcomingOrToday(date: string): boolean {
  if (!date) return false;

  const normalizedDate = date.length >= 10 ? date.slice(0, 10) : date;
  const parsedDate = new Date(normalizedDate);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return parsedDate >= startOfToday;
}

export default function Command() {
  const { token, isLoading: isTokenLoading, setToken, logout } = useAuthToken();
  const tokenAvailable = Boolean(token);

  const {
    data: items = [],
    isLoading,
    mutate,
  } = useFetch<
    { planning?: PlanningItem[]; episodes?: PlanningItem[] } | PlanningItem[],
    MemberPlanning[],
    MemberPlanning[]
  >(buildBetaSeriesUrl("/planning/member", { unseen: "true" }), {
    headers: getHeaders(token),
    execute: tokenAvailable && !isTokenLoading,
    initialData: [],
    parseResponse: (response) =>
      parseBetaSeriesResponse<
        | { planning?: PlanningItem[]; episodes?: PlanningItem[] }
        | PlanningItem[]
      >(response),
    mapResult: (result) => {
      let rawItems: PlanningItem[] = [];
      if (Array.isArray(result)) rawItems = result;
      else if (Array.isArray(result.planning)) rawItems = result.planning;
      else if (Array.isArray(result.episodes)) rawItems = result.episodes;

      return {
        data: rawItems.map((item) => ({
          date: item.date || "",
          episode_id: item.id || item.episode_id || 0,
          show_id: item.show?.id || item.show_id || 0,
          show_title: item.show?.title || item.show_title || "Unknown Show",
          season: item.season || 0,
          episode: item.episode || 0,
          title: item.title || "",
          code: item.code || `S${item.season || 0}E${item.episode || 0}`,
        })),
      };
    },
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load planning",
        message: error.message,
      });
    },
  });

  if (isTokenLoading) {
    return <List isLoading />;
  }

  if (!tokenAvailable) {
    return <TokenRequiredView onTokenSaved={setToken} />;
  }

  const handleMarkAsWatched = async (id: number) => {
    try {
      await mutate(markEpisodeAsWatched(String(id)), {
        optimisticUpdate: (previous = []) =>
          previous.filter((item) => item.episode_id !== id),
        shouldRevalidateAfter: false,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to mark as watched",
          message: error.message,
        });
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    await showToast({
      style: Toast.Style.Success,
      title: "Logged out",
      message: "Your BetaSeries token has been removed.",
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter planning...">
      <List.EmptyView
        title="Nothing in planning"
        description="No upcoming episodes were found."
      />
      {items
        .filter((item) => isUpcomingOrToday(item.date))
        .map((item) => (
          <List.Item
            key={`${item.episode_id}-${item.show_id}-${item.code}-${item.date}`}
            title={item.show_title || "Unknown Show"}
            subtitle={`${item.code || `S${item.season}E${item.episode}`} - ${item.title || "Episode"}`}
            accessories={[{ text: item.date || "" }]}
            actions={
              <ActionPanel>
                <Action
                  title="Mark as Watched"
                  icon={Icon.CheckCircle}
                  onAction={() => handleMarkAsWatched(item.episode_id)}
                />
                <Action.OpenInBrowser
                  url={`https://www.betaseries.com/episode/${item.show_title}/${item.code}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
                <Action
                  title="Logout"
                  icon={Icon.XMarkCircle}
                  onAction={() => void handleLogout()}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
