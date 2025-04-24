import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  MediaResult,
  ArrSettings,
  ServerTestResponse,
  TVShowSeason,
  TVShowDetails,
  Preferences,
  ServerTag,
} from "../types";
import { normalizeApiUrl } from "utils";

/**
 * Form component for submitting media requests to Radarr/Sonarr
 * Handles both movie and TV show requests with different options for each
 * @param media - Media result object containing details about the item to request
 * @returns React component for media request form
 */
export function MediaRequestForm({ media }: { media: MediaResult }) {
  const { apiUrl, apiKey } = getPreferenceValues<Preferences>();
  const [settings, setSettings] = useState<ArrSettings[]>([]);
  const [serverDetails, setServerDetails] = useState<ServerTestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<TVShowSeason[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<ServerTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Determine which service to use based on media type
  const settingsEndpoint = media.mediaType === "movie" ? "radarr" : "sonarr";
  const baseApiUrl = normalizeApiUrl(apiUrl);

  /**
   * Fetches server settings and details from Radarr/Sonarr
   * Gets quality profiles and root folders for request configuration
   */
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`${baseApiUrl}/settings/${settingsEndpoint}`, {
          headers: {
            "X-Api-Key": apiKey,
            accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response body:", errorText);
          throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        setSettings(data);

        // Get server details directly without user selection
        if (data.length > 0) {
          const testResponse = await fetch(`${baseApiUrl}/settings/${settingsEndpoint}/test`, {
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
          // Set available tags from server response
          if (serverData.tags) {
            setAvailableTags(serverData.tags);
          }
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
  }, [baseApiUrl, apiKey, settingsEndpoint]);

  /**
   * Fetches additional details for TV shows including season information
   * Only runs when the media type is 'tv'
   */
  useEffect(() => {
    async function fetchTVShowDetails() {
      if (media.mediaType !== "tv") return;

      try {
        const response = await fetch(`${baseApiUrl}/tv/${media.id}`, {
          headers: {
            "X-Api-Key": apiKey,
            accept: "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch TV show details");
        const data: TVShowDetails = await response.json();
        setSeasons(data.seasons);
      } catch (err) {
        console.error("TV show details fetch error:", err);
      }
    }

    fetchTVShowDetails();
  }, [media.id, media.mediaType, baseApiUrl, apiKey]);

  /**
   * Handles form submission and sends request to the API
   * @param values - Form values including profile, rootFolder, and tags
   */
  async function handleSubmit(values: { profile: string; rootFolder: string; tags: string[] }) {
    try {
      // Convert tag strings to numeric IDs
      const tagIds = values.tags
        .map((tagLabel) => availableTags.find((tag) => tag.label === tagLabel)?.id)
        .filter((id): id is number => id !== undefined);

      const requestBody = {
        mediaType: media.mediaType === "tv" ? "tv" : "movie",
        mediaId: media.id,
        serverId: settings[0]?.id,
        profileId: parseInt(values.profile),
        rootFolder: values.rootFolder,
        tags: tagIds.length > 0 ? tagIds : undefined,
        ...(media.mediaType === "tv" && {
          seasons: selectedSeasons.length > 0 ? selectedSeasons : "all",
        }),
      };

      console.log("Submitting request with data:", requestBody);

      const response = await fetch(`${baseApiUrl}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Server response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Failed to submit request: ${response.statusText}`);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Request Submitted",
        message: `Successfully requested ${media.title || media.name}`,
      });
    } catch (err) {
      console.error("Request submission error:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to submit request: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Handles season selection changes in the tag picker
   * Converts string array of season numbers to integers
   * @param seasonNumbers - Array of selected season numbers as strings
   */
  const handleSeasonChange = (seasonNumbers: string[]) => {
    setSelectedSeasons(seasonNumbers.map((n) => parseInt(n)));
  };

  // Handle tag selection changes
  const handleTagChange = (tagLabels: string[]) => {
    setSelectedTags(tagLabels);
  };

  // Show loading state while fetching initial data
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
      {/* Quality Profile Selection */}
      <Form.Dropdown id="profile" title="Quality Profile" defaultValue={serverDetails?.profiles[0]?.id.toString()}>
        {serverDetails?.profiles.map((profile) => (
          <Form.Dropdown.Item key={profile.id} value={profile.id.toString()} title={profile.name} />
        ))}
      </Form.Dropdown>

      {/* Root Folder Selection */}
      <Form.Dropdown id="rootFolder" title="Root Folder" defaultValue={serverDetails?.rootFolders[0]?.path}>
        {serverDetails?.rootFolders.map((folder) => (
          <Form.Dropdown.Item key={folder.id} value={folder.path} title={folder.path} />
        ))}
      </Form.Dropdown>

      {/* Season Selection for TV Shows */}
      {media.mediaType === "tv" && seasons.length > 0 && (
        <Form.TagPicker
          id="seasons"
          title="Seasons"
          placeholder="Select seasons (leave empty for all)"
          onChange={handleSeasonChange}
        >
          {seasons.map((season) => (
            <Form.TagPicker.Item
              key={season.seasonNumber}
              value={season.seasonNumber.toString()}
              title={`${season.name} (${season.episodeCount} episodes)`}
            />
          ))}
        </Form.TagPicker>
      )}

      {/* Tag Selection */}
      {availableTags.length > 0 && (
        <Form.TagPicker
          id="tags"
          title="Tags"
          placeholder="Select tags (optional)"
          value={selectedTags}
          onChange={handleTagChange}
        >
          {availableTags.map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.label} title={tag.label} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
