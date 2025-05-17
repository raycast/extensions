import React from "react";
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
import axios from "axios";
import { preferences, getCombinedStatus } from "./utils";
import { OverseerrRequest } from "./types";
import ApprovalForm from "./ApprovalForm";

const OVERSEERR_API_ADDRESS = `${preferences.OVERSEERR_API_ADDRESS}/api/v1/request`;
const OVERSEERR_API_KEY = preferences.OVERSEERR_API_KEY;
const TMDB_KEY = preferences.TMDB_KEY;
const TMDB_LANGUAGE = preferences.TMDB_LANGUAGE || "en";

export default function Command() {
  const [requests, setRequests] = useState<OverseerrRequest[]>([]);
  const [tmdbTitles, setTmdbTitles] = useState<{ [id: number]: string }>({});
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const { data } = await axios.get<{ results: OverseerrRequest[] }>(
        `${OVERSEERR_API_ADDRESS}?take=100`,
        {
          headers: { "X-Api-Key": OVERSEERR_API_KEY },
        },
      );

      const results = data.results || [];
      setRequests(results);

      const titleMap: { [id: number]: string } = {};
      await Promise.all(
        results.map(async (r) => {
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
    } catch (err: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load requests",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(id: number, action: "approve" | "decline") {
    try {
      await axios.post(`${OVERSEERR_API_ADDRESS}/${id}/${action}`, null, {
        headers: { "X-Api-Key": OVERSEERR_API_KEY },
      });
      showToast({
        style: Toast.Style.Success,
        title: `Request #${id} ${action === "approve" ? "Approved" : "Declined"}`,
      });
      fetchRequests();
    } catch (err: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: `Request ${action} failed`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <List isLoading={loading} searchBarPlaceholder="Search title or user">
      {requests.map((r) => (
        <List.Item
          key={r.id}
          icon={Icon.Download}
          title={
            tmdbTitles[r.media?.tmdbId] || `TMDB: ${r.media?.tmdbId || "-"}`
          }
          subtitle={r.requestedBy?.plexUsername || "unknown"}
          accessories={[{ text: `#${r.id}` }, { tag: getCombinedStatus(r) }]}
          actions={
            <ActionPanel>
              {r.status === 1 ? (
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
      ))}
    </List>
  );
}
