import { List, Icon, Color } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import React from "react";
import { ENDPOINTS, plex_token } from "../utils/constants";
import { SessionApiResponse } from "../types/types";

export default function Command() {
  const { data, isLoading } = useFetch(ENDPOINTS.activeSessions, {
    headers: { "X-Plex-Token": plex_token, Accept: "application/json" },
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search..." throttle>
      {!data || !Array.isArray(data) || data.length === 0 ? (
        <List.EmptyView key="no_active_sessions" icon="🧐" title="No active Plex sessions" />
      ) : (
        <>
          {data.map((session: SessionApiResponse["MediaContainer"]["Metadata"]) => (
            <SessionItem key={session.guid} session={session} />
          ))}
        </>
      )}
    </List>
  );
}

function SessionItem({ session }: { session: SessionApiResponse["MediaContainer"]["Metadata"] }) {
  return (
    <List.Item
      key={session.title}
      icon="command-icon-plex.png"
      title={session.title}
      accessories={[
        { tag: { value: session.User.title, color: Color.Blue }, icon: Icon.Person, tooltip: "Session User" },
        {
          tag: { value: session.Player.title, color: Color.Purple },
          icon: Icon.Devices,
          tooltip: "Session Platform",
        },
        {
          tag: { value: session.Player.device, color: Color.Purple },
          icon: Icon.Devices,
          tooltip: "Session Device",
        },
        {
          tag: { value: session.Player.state, color: Color.Green },
          icon: Icon.Play,
          tooltip: "Session Device",
        },
      ]}
    />
  );
}

async function parseResponse(response: Response): Promise<SessionApiResponse["MediaContainer"]["Metadata"]> {
  const json = (await response.json()) as SessionApiResponse;

  if (!response.ok || !json.MediaContainer || !json.MediaContainer) {
    throw new Error("Error in response");
  }

  return json.MediaContainer.Metadata;
}
