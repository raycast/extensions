import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { MovieResult, RadarrSettings, ServerTestResponse } from "../types";

interface Preferences {
  apiUrl: string;
  apiKey: string;
}

export function RequestForm({ movie }: { movie: MovieResult }) {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const [settings, setSettings] = useState<RadarrSettings[]>([]);
  const [serverDetails, setServerDetails] = useState<ServerTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const settingsEndpoint = movie.mediaType === "movie" ? "radarr" : "sonarr";

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`${apiUrl}/settings/${settingsEndpoint}`, {
          headers: {
            "X-Api-Key": apiKey,
            accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();
        setSettings(data);

        // Get server details directly without user selection
        if (data.length > 0) {
          const testResponse = await fetch(`${apiUrl}/settings/${settingsEndpoint}/test`, {
            method: "POST",
            headers: {
              "X-Api-Key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              hostname: data[0].hostname,
              port: data[0].port,
              apiKey: data[0].apiKey,
              useSsl: data[0].useSsl,
              baseUrl: data[0].baseUrl,
            }),
          });

          if (!testResponse.ok) throw new Error("Failed to fetch server details");
          const serverData = await testResponse.json();
          setServerDetails(serverData);
        }
      } catch (err) {
        console.error("Settings fetch error:", err);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to fetch server settings",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [apiUrl, apiKey, settingsEndpoint]);

  async function handleSubmit(values: { profile: string; rootFolder: string; tag: string }) {
    try {
      const response = await fetch(`${apiUrl}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          mediaType: movie.mediaType,
          mediaId: movie.id,
          serverId: settings[0]?.id, // Use first server automatically
          profileId: parseInt(values.profile),
          rootFolder: values.rootFolder,
          tags: values.tag ? [values.tag] : [],
        }),
      });

      if (!response.ok) throw new Error("Failed to submit request");

      await showToast({
        style: Toast.Style.Success,
        title: "Request Submitted",
        message: `Successfully requested ${movie.title || movie.name}`,
      });
    } catch (err) {
      console.error("Request submission error:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to submit request",
      });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Request" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="profile" title="Quality Profile" defaultValue={serverDetails?.profiles[0]?.id.toString()}>
        {serverDetails?.profiles.map((profile) => (
          <Form.Dropdown.Item key={profile.id} value={profile.id.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="rootFolder" title="Root Folder" defaultValue={serverDetails?.rootFolders[0]?.path}>
        {serverDetails?.rootFolders.map((folder) => (
          <Form.Dropdown.Item key={folder.id} value={folder.path} title={folder.path} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="tag" title="Tag" placeholder="Add an optional tag for this request..." />
    </Form>
  );
}
