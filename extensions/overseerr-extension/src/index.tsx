// src/index.tsx
import {
  List,
  showToast,
  Toast,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { preferences, getCombinedStatus } from "./utils";
import axios from "axios";
import ApprovalForm from "./ApprovalForm";

const OVERSEERR_API_REQUEST = `${preferences.OVERSEERR_API_ADDRESS}/api/v1/request`;
const OVERSEERR_API_KEY = preferences.OVERSEERR_API_KEY;
const TMDB_KEY = preferences.TMDB_KEY;
const TMDB_LANGUAGE = preferences.TMDB_LANGUAGE || "en";

export default function Command() {
  const [requests, setRequests] = useState<any[]>([]);
  const [tmdbTitles, setTmdbTitles] = useState<{ [id: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const { data } = await axios.get(`${OVERSEERR_API_REQUEST}?take=100`, {
        headers: { "X-Api-Key": OVERSEERR_API_KEY },
      });

      const results = data.results || [];
      setRequests(results);

      const titleMap: { [id: number]: string } = {};
      await Promise.all(
        results.map(async (r: any) => {
          const tmdbId = r.media?.tmdbId;
          const type = r.media?.mediaType;
          if (!tmdbId || !type) return;

          const url =
            type === "tv"
              ? `https://api.themoviedb.org/3/tv/${tmdbId}`
              : `https://api.themoviedb.org/3/movie/${tmdbId}`;

          try {
            const { data: item } = await axios.get(url, {
              params: { api_key: TMDB_KEY, language: TMDB_LANGUAGE },
            });
            titleMap[tmdbId] = item.name || item.title || "(Unknown Title)";
          } catch {
            titleMap[tmdbId] = "(Failed to load Title)";
          }
        }),
      );

      setTmdbTitles(titleMap);
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load requests",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(id: number, action: "approve" | "decline") {
    try {
      await axios.post(`${OVERSEERR_API_REQUEST}/${id}/${action}`, null, {
        headers: { "X-Api-Key": OVERSEERR_API_KEY },
      });
      showToast({
        style: Toast.Style.Success,
        title: `Request #${id} ${action === "approve" ? "Approved" : "Declined"}`,
      });
      fetchRequests();
    } catch (err: any) {
      showToast({
        style: Toast.Style.Failure,
        title: `Request ${action} failed`,
        message: err.message,
      });
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search requests">
      {requests.map((r) => {
        const title =
          tmdbTitles[r.media?.tmdbId] || `TMDB: ${r.media?.tmdbId || "-"}`;
        const subtitle = r.requestedBy?.plexUsername || "unknown";
        const status = getCombinedStatus(r);
        const isPending = r.status === 1;

        return (
          <List.Item
            key={r.id}
            icon={Icon.Download}
            title={title}
            subtitle={subtitle}
            accessories={[{ text: `#${r.id}` }, { tag: status }]}
            actions={
              <ActionPanel>
                {isPending ? (
                  <Action
                    title="Approve with Options"
                    icon={Icon.CheckCircle}
                    onAction={() => push(<ApprovalForm request={r} />)}
                  />
                ) : (
                  <>
                    <Action
                      title="Approve"
                      icon={Icon.Check}
                      onAction={() => handleRequest(r.id, "approve")}
                    />
                    <Action
                      title="Decline"
                      icon={Icon.XMarkCircle}
                      onAction={() => handleRequest(r.id, "decline")}
                    />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
