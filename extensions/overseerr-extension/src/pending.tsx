import {
  List,
  showToast,
  Toast,
  Icon,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigation } from "@raycast/api";
import ApprovalForm from "./ApprovalForm";
import { preferences, OVERSEERR_API_REQUEST } from "./utils";

export default function PendingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [tmdbTitles, setTmdbTitles] = useState<{ [id: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  async function fetchPendingRequests() {
    setLoading(true);
    try {
      const { data } = await axios.get(`${OVERSEERR_API_REQUEST}?take=100`, {
        headers: { "X-Api-Key": preferences.OVERSEERR_API_KEY },
      });

      const pending = data.results.filter((r: any) => r.status === 1);
      setRequests(pending);

      const titleMap: { [id: number]: string } = {};
      await Promise.all(
        pending.map(async (r) => {
          const tmdbId = r.media?.tmdbId;
          const type = r.media?.mediaType;
          if (!tmdbId || !type) return;

          const url =
            type === "tv"
              ? `https://api.themoviedb.org/3/tv/${tmdbId}`
              : `https://api.themoviedb.org/3/movie/${tmdbId}`;

          try {
            const { data } = await axios.get(url, {
              params: {
                api_key: preferences.TMDB_KEY,
                language: preferences.TMDB_LANGUAGE,
              },
            });
            titleMap[tmdbId] = data.name || data.title || "(Unknown Title)";
          } catch {
            titleMap[tmdbId] = "(Failed to load Title)";
          }
        }),
      );

      setTmdbTitles(titleMap);
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load pending requests",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search pending requests">
      {requests.map((r) => (
        <List.Item
          key={r.id}
          icon={Icon.Hourglass}
          title={tmdbTitles[r.media?.tmdbId] || "(Unknown Title)"}
          subtitle={r.requestedBy?.plexUsername || "unknown"}
          accessories={[{ text: `#${r.id}` }]}
          actions={
            <ActionPanel>
              <Action
                title="Approve with Options"
                icon={Icon.CheckCircle}
                onAction={() => push(<ApprovalForm request={r} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
