import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { useEffect, useState } from "react";
import { preferences } from "./utils";
import axios from "axios";
import { OverseerrRequest, ServerConfig, QualityProfile } from "./types";

interface ApprovalFormProps {
  request: OverseerrRequest;
}

const BASE_API = `${preferences.OVERSEERR_API_ADDRESS}/api/v1`;
const API_KEY = preferences.OVERSEERR_API_KEY;

export default function ApprovalForm({ request }: ApprovalFormProps) {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [profiles, setProfiles] = useState<QualityProfile[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>();
  const [selectedProfileId, setSelectedProfileId] = useState<string>();
  const [selectedFolder, setSelectedFolder] = useState<string>();
  const [loading, setLoading] = useState(true);
  const { pop } = useNavigation();

  const mediaType = request.media?.mediaType;
  const endpoint = mediaType === "tv" ? "sonarr" : "radarr";

  useEffect(() => {
    loadServerOptions();
  }, []);

  useEffect(() => {
    if (mediaType === "movie" && selectedServerId) {
      loadRadarrProfiles(parseInt(selectedServerId));
    }
  }, [selectedServerId]);

  async function loadServerOptions() {
    setLoading(true);
    try {
      const { data } = await axios.get<ServerConfig[]>(
        `${BASE_API}/settings/${endpoint}`,
        {
          headers: { "X-Api-Key": API_KEY },
        },
      );

      setServers(data);

      if (data.length > 0) {
        const first = data[0];
        setSelectedServerId(first.id.toString());
        setSelectedFolder(first.activeDirectory);

        if (mediaType === "tv") {
          setProfiles([
            {
              id: first.activeProfileId,
              name: first.activeProfileName,
            },
          ]);
          setSelectedProfileId(first.activeProfileId.toString());
        }
      }
    } catch (err: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load server settings",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRadarrProfiles(serverId: number) {
    try {
      const { data } = await axios.get<QualityProfile[]>(
        `${BASE_API}/settings/radarr/${serverId}/profiles`,
        {
          headers: { "X-Api-Key": API_KEY },
        },
      );

      setProfiles(data);
      setSelectedProfileId(data[0]?.id.toString() || "");
    } catch (err: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load Radarr profiles",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleSubmit(values: {
    serverId: string;
    profileId: string;
    rootFolder: string;
  }) {
    try {
      await axios.post(
        `${BASE_API}/request/${request.id}/approve`,
        {
          serverId: parseInt(values.serverId),
          profileId: parseInt(values.profileId),
          rootFolder: values.rootFolder,
        },
        {
          headers: { "X-Api-Key": API_KEY },
        },
      );

      showToast({
        style: Toast.Style.Success,
        title: `Request #${request.id} Approved`,
      });
      pop();
    } catch (err: unknown) {
      showToast({
        style: Toast.Style.Failure,
        title: "Approval failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Approve Request #${request.id}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Approve Request" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="serverId"
        title="Library"
        value={selectedServerId}
        onChange={(id) => {
          setSelectedServerId(id);
          const server = servers.find((s) => s.id.toString() === id);
          if (server) setSelectedFolder(server.activeDirectory);
        }}
      >
        {servers.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={s.id.toString()}
            title={s.name}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="profileId"
        title="Quality Profile"
        value={selectedProfileId}
        onChange={setSelectedProfileId}
      >
        {profiles.map((p) => (
          <Form.Dropdown.Item
            key={p.id}
            value={p.id.toString()}
            title={p.name}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="rootFolder"
        title="Root Folder"
        value={selectedFolder}
        onChange={setSelectedFolder}
      >
        {servers.map((s) => (
          <Form.Dropdown.Item
            key={s.id}
            value={s.activeDirectory}
            title={s.activeDirectory}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
