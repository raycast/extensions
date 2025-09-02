import React, { useState, useCallback, useEffect } from "react";
import {
  Form,
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  LaunchProps,
  List,
} from "@raycast/api";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Type assertions to fix React type conflicts
const FormComponent = Form as any;
const ActionComponent = Action as any;
const ActionPanelComponent = ActionPanel as any;
const ListComponent = List as any;
import { useCachedPromise, CachedPromiseOptions } from "@raycast/utils";

import {
  Preferences,
  QUALITY_OPTIONS,
  checkAniCliInstallation,
  playAnimeSeamlessly,
  copyAniCliCommand,
  downloadAnime,
  downloadAnimeSeries,
  PlaybackOptions,
  validateEpisodeRange,
  validateEpisodeNumber,
} from "./ani-cli-utils";

import {
  AniListAnime,
  searchAnime,
  getBestTitle,
  formatAiringStatus,
  getSeasonString,
  formatScore,
  getStudioName,
  getNextEpisodeInfo,
  findBestAniCliMatch,
} from "./anilist-utils";

interface LaunchArgs {
  animeTitle?: string;
  episode?: string;
}

type OperationType = "play" | "download" | "downloadSeries";
type AudioType = "sub" | "dub";

interface PlaybackForm {
  episodeNumber: string;
  quality: PlaybackOptions["quality"];
  downloadPath: string;
  episodeRange: string;
}

interface OperationInfo {
  title: string;
  episode: number | string;
  matchedTitle?: string;
  selectedIndex?: number;
  downloadPath?: string;
  operationType: OperationType;
  audioType: AudioType;
  timestamp: number;
}

// PlaybackForm Component - Using Form API for inputs
function PlaybackFormComponent({
  selectedAnime,
  onBack,
}: {
  selectedAnime: AniListAnime;
  onBack: () => void;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const [formData, setFormData] = useState<PlaybackForm>({
    episodeNumber: "1",
    quality: preferences.defaultQuality || "best",
    downloadPath: "",
    episodeRange: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastOperation, setLastOperation] = useState<OperationInfo | null>(
    null,
  );

  const isFormValid = React.useMemo(() => {
    return validateEpisodeNumber(formData.episodeNumber);
  }, [formData.episodeNumber]);

  const isRangeValid = React.useMemo(() => {
    if (!formData.episodeRange.trim()) return false;
    return validateEpisodeRange(formData.episodeRange);
  }, [formData.episodeRange]);

  const handleFormChange = useCallback(
    (field: keyof PlaybackForm, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const executeOperation = useCallback(
    async (operationType: OperationType, audioType: AudioType) => {
      if (isProcessing) return;

      const animeTitle = getBestTitle(selectedAnime);

      // Validation
      if (operationType === "downloadSeries" && !isRangeValid) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid episode range",
          message: "Please enter a valid range like '1-12' or '5-10'",
        });
        return;
      }

      if (
        (operationType === "play" || operationType === "download") &&
        !isFormValid
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid episode number",
          message: "Please enter a valid episode number",
        });
        return;
      }

      // Confirmation dialog
      const getConfirmationMessage = () => {
        const audioLabel = audioType.toUpperCase();
        const qualityText =
          formData.quality === "best" ? "Best Quality" : formData.quality;

        switch (operationType) {
          case "play":
            return `Play "${animeTitle}" Episode ${formData.episodeNumber} in ${qualityText} (${audioLabel})?`;
          case "download":
            return `Download "${animeTitle}" Episode ${formData.episodeNumber} in ${qualityText} (${audioLabel})?${
              formData.downloadPath ? `\nPath: ${formData.downloadPath}` : ""
            }`;
          case "downloadSeries":
            return `Download "${animeTitle}" Episodes ${formData.episodeRange} in ${qualityText} (${audioLabel})?${
              formData.downloadPath ? `\nPath: ${formData.downloadPath}` : ""
            }`;
          default:
            return "";
        }
      };

      const confirmed = await confirmAlert({
        title: operationType === "play" ? "Play Anime" : "Download Anime",
        message: getConfirmationMessage(),
        primaryAction: {
          title: operationType === "play" ? "Play" : "Download",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });

      if (!confirmed) return;

      setIsProcessing(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Starting ${operationType}...`,
        message: `Using AniList data for "${animeTitle}"`,
      });

      try {
        let result;
        const bestMatch = findBestAniCliMatch(selectedAnime, animeTitle);
        const searchTitle = bestMatch.score > 70 ? bestMatch.title : animeTitle;

        const playbackOptions: PlaybackOptions = {
          quality: formData.quality,
          episode:
            operationType === "downloadSeries"
              ? formData.episodeRange
              : parseInt(formData.episodeNumber),
          dub: audioType === "dub",
          useDirectTitle: true,
        };

        switch (operationType) {
          case "play":
            result = await playAnimeSeamlessly(searchTitle, playbackOptions);
            break;
          case "download":
            result = await downloadAnime(searchTitle, {
              ...playbackOptions,
              downloadPath: formData.downloadPath || undefined,
            });
            break;
          case "downloadSeries":
            result = await downloadAnimeSeries(searchTitle, {
              ...playbackOptions,
              episodeRange: formData.episodeRange,
              downloadPath: formData.downloadPath || undefined,
            });
            break;
        }

        if (result?.success) {
          toast.style = Toast.Style.Success;
          toast.title =
            operationType === "play" ? "Playback started" : "Download started";
          toast.message = result.data?.message || "Operation completed";

          setLastOperation({
            title: animeTitle,
            episode:
              operationType === "downloadSeries"
                ? formData.episodeRange
                : parseInt(formData.episodeNumber),
            matchedTitle: result.data?.matchedTitle,
            selectedIndex: result.data?.selectedIndex,
            downloadPath: result.data?.downloadPath,
            operationType,
            audioType,
            timestamp: Date.now(),
          });
        } else {
          throw new Error(result?.error || "Operation failed");
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to ${operationType}`;
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        setIsProcessing(false);
      }
    },
    [formData, isFormValid, isRangeValid, isProcessing, selectedAnime],
  );

  const handleCopyCommand = useCallback(
    async (audioType: AudioType, isDownload: boolean) => {
      if (!isFormValid) return;

      const animeTitle = getBestTitle(selectedAnime);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Generating command...",
        message: "Using AniList data for best match",
      });

      try {
        const playbackOptions: PlaybackOptions = {
          quality: formData.quality,
          episode: parseInt(formData.episodeNumber),
          dub: audioType === "dub",
          useDirectTitle: true,
        };

        const bestMatch = findBestAniCliMatch(selectedAnime, animeTitle);
        const searchTitle = bestMatch.score > 70 ? bestMatch.title : animeTitle;

        const result = await copyAniCliCommand(
          searchTitle,
          playbackOptions,
          isDownload,
          formData.downloadPath || undefined,
        );

        if (result.success && result.data?.command) {
          toast.style = Toast.Style.Success;
          toast.title = "Command copied";
          toast.message = `${isDownload ? "Download" : "Play"} command copied for "${searchTitle}"`;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to copy command";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    },
    [formData, isFormValid, selectedAnime],
  );

  const maxEpisode = selectedAnime.episodes || 999;

  return (
    <FormComponent
      navigationTitle={`${getBestTitle(selectedAnime)} - Actions`}
      actions={
        <ActionPanelComponent>
          <ActionPanelComponent.Section title="Playback">
            <ActionComponent
              title={`Play Episode ${formData.episodeNumber} (Sub)`}
              icon={Icon.Play}
              onAction={() => executeOperation("play", "sub")}
            />
            <ActionComponent
              title={`Play Episode ${formData.episodeNumber} (Dub)`}
              icon={Icon.SpeechBubble}
              onAction={() => executeOperation("play", "dub")}
            />
          </ActionPanelComponent.Section>
          <ActionPanelComponent.Section title="Download Single Episode">
            <ActionComponent
              title={`Download Episode ${formData.episodeNumber} (Sub)`}
              icon={Icon.Download}
              onAction={() => executeOperation("download", "sub")}
            />
            <ActionComponent
              title={`Download Episode ${formData.episodeNumber} (Dub)`}
              icon={Icon.ArrowDownCircle}
              onAction={() => executeOperation("download", "dub")}
            />
          </ActionPanelComponent.Section>
          {isRangeValid && (
            <ActionPanelComponent.Section title="Download Series">
              <ActionComponent
                title={`Download Episodes ${formData.episodeRange} (Sub)`}
                icon={Icon.Document}
                onAction={() => executeOperation("downloadSeries", "sub")}
              />
              <ActionComponent
                title={`Download Episodes ${formData.episodeRange} (Dub)`}
                icon={Icon.SaveDocument}
                onAction={() => executeOperation("downloadSeries", "dub")}
              />
            </ActionPanelComponent.Section>
          )}
          <ActionPanelComponent.Section title="Copy Commands">
            <ActionComponent
              title="Copy Play Command (Sub)"
              icon={Icon.Clipboard}
              onAction={() => handleCopyCommand("sub", false)}
            />
            <ActionComponent
              title="Copy Download Command (Sub)"
              icon={Icon.CopyClipboard}
              onAction={() => handleCopyCommand("sub", true)}
            />
          </ActionPanelComponent.Section>
          <ActionPanelComponent.Section title="Navigation">
            <ActionComponent
              title="Back to Search"
              icon={Icon.ArrowLeft}
              onAction={onBack}
            />
          </ActionPanelComponent.Section>
        </ActionPanelComponent>
      }
    >
      <FormComponent.Description
        title="Selected Anime"
        text={`${getBestTitle(selectedAnime)} • ${getStudioName(selectedAnime)} • ${getSeasonString(selectedAnime)}`}
      />
      <FormComponent.TextField
        id="episodeNumber"
        title="Episode Number"
        placeholder={`1-${maxEpisode}`}
        value={formData.episodeNumber}
        onChange={(value: string) => handleFormChange("episodeNumber", value)}
        info={`Enter episode number (1-${maxEpisode})`}
        error={
          !isFormValid && formData.episodeNumber
            ? "Please enter a valid episode number"
            : undefined
        }
      />
      <FormComponent.Separator />
      <FormComponent.TextField
        id="episodeRange"
        title="Episode Range (for series download)"
        placeholder="e.g., 1-12, 1-24, 5-10"
        value={formData.episodeRange}
        onChange={(value: string) => handleFormChange("episodeRange", value)}
        info="Download multiple episodes (e.g., 1-12 for episodes 1 through 12)"
        error={
          formData.episodeRange && !isRangeValid
            ? "Please enter a valid range like '1-12'"
            : undefined
        }
      />
      <FormComponent.Separator />
      <FormComponent.TextField
        id="downloadPath"
        title="Download Path (Optional)"
        placeholder="Leave empty for default location"
        value={formData.downloadPath}
        onChange={(value: string) => handleFormChange("downloadPath", value)}
        info="Specify custom download directory (optional)"
      />
      <FormComponent.Dropdown
        id="quality"
        title="Video Quality"
        value={formData.quality}
        onChange={(value: string) =>
          handleFormChange("quality", value as PlaybackOptions["quality"])
        }
      >
        {QUALITY_OPTIONS.map((quality) => (
          <FormComponent.Dropdown.Item
            key={quality}
            value={quality}
            title={quality === "best" ? "Best Available" : quality}
            icon={quality === "best" ? Icon.Star : Icon.Video}
          />
        ))}
      </FormComponent.Dropdown>
      <FormComponent.Separator />
      <FormComponent.Description
        title="Anime Info"
        text={`Status: ${formatAiringStatus(selectedAnime)} | Score: ${formatScore(selectedAnime.averageScore)} | Episodes: ${selectedAnime.episodes || "Unknown"}`}
      />
      {getNextEpisodeInfo(selectedAnime) && (
        <FormComponent.Description
          title="Next Episode"
          text={getNextEpisodeInfo(selectedAnime)}
        />
      )}
      {lastOperation && (
        <FormComponent.Description
          title="Last Operation"
          text={`${lastOperation.operationType === "play" ? "Played" : "Downloaded"} ${
            typeof lastOperation.episode === "string"
              ? `episodes ${lastOperation.episode}`
              : `episode ${lastOperation.episode}`
          } (${lastOperation.audioType.toUpperCase()})${
            lastOperation.matchedTitle
              ? ` using "${lastOperation.matchedTitle}"`
              : ""
          }`}
        />
      )}
      {isProcessing && (
        <FormComponent.Description
          title="Processing"
          text="Please wait while the operation is being executed..."
        />
      )}
    </FormComponent>
  );
}

// Custom hook for installation checking

function useInstallationCheck() {
  const options: CachedPromiseOptions<() => Promise<boolean>, boolean> = {
    failureToastOptions: undefined,
  };

  return useCachedPromise<() => Promise<boolean>, boolean>(
    checkAniCliInstallation,
    [], // no arguments
    options,
  );
}

// Custom hook for anime searching
function useAnimeSearch(query: string) {
  return useCachedPromise(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) return [];
      return await searchAnime(searchQuery, 1, 15);
    },
    [query],
    {
      keepPreviousData: true,
    },
  );
}

// Anime list item component
function AnimeListItem({
  anime,
  onSelect,
}: {
  anime: AniListAnime;
  onSelect: (anime: AniListAnime) => void;
}) {
  const title = getBestTitle(anime);
  const studio = getStudioName(anime);
  const season = getSeasonString(anime);
  const status = formatAiringStatus(anime);
  const score = formatScore(anime.averageScore);
  const nextEpisode = getNextEpisodeInfo(anime);

  const accessories: List.Item.Accessory[] = [];

  // Add score with star icon
  if (anime.averageScore) {
    accessories.push({ text: score, icon: Icon.Star });
  }

  // Add episode count
  if (anime.episodes) {
    accessories.push({ text: `${anime.episodes} eps`, icon: Icon.Video });
  }

  // Add status
  const statusIcon =
    anime.status === "RELEASING"
      ? Icon.Clock
      : anime.status === "FINISHED"
        ? Icon.CheckCircle
        : Icon.QuestionMark;
  accessories.push({ text: status, icon: statusIcon });

  const description = anime.description
    ? anime.description.replace(/<[^>]*>/g, "").slice(0, 200) + "..."
    : "No description available.";

  return (
    <ListComponent.Item
      title={title}
      subtitle={`${studio} • ${season}`}
      accessories={accessories}
      icon={
        anime.coverImage.medium
          ? { source: anime.coverImage.medium }
          : Icon.Play
      }
      actions={
        <ActionPanelComponent>
          <ActionPanelComponent.Section title="Actions">
            <ActionComponent
              title="Select This Anime"
              icon={Icon.Check}
              onAction={() => onSelect(anime)}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanelComponent.Section>
          <ActionPanelComponent.Section title="External Links">
            <ActionComponent.OpenInBrowser
              title="View on Anilist"
              url={`https://anilist.co/anime/${anime.id}`}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
            {anime.title.english && (
              <ActionComponent.OpenInBrowser
                title="Search on Myanimelist"
                url={`https://myanimelist.net/anime.php?q=${encodeURIComponent(anime.title.english)}`}
                icon={Icon.MagnifyingGlass}
              />
            )}
          </ActionPanelComponent.Section>
        </ActionPanelComponent>
      }
      detail={
        <ListComponent.Item.Detail
          markdown={`
# ${title}

${description}

## Details
- **Studio:** ${studio}
- **Season:** ${season}
- **Episodes:** ${anime.episodes || "Unknown"}
- **Status:** ${status}
- **Score:** ${score}
- **Format:** ${anime.format}
- **Duration:** ${anime.duration ? `${anime.duration} min per episode` : "Unknown"}
- **Genres:** ${anime.genres.join(", ") || "No genres listed"}
${nextEpisode ? `- **Next Episode:** ${nextEpisode}` : ""}

${anime.coverImage.large ? `![Cover](${anime.coverImage.large})` : ""}
        `}
        />
      }
    />
  );
}

// Installation error component
function InstallationError({
  error,
  onRecheck,
}: {
  error?: Error | null;
  onRecheck: () => void;
}) {
  return (
    <ListComponent>
      <ListComponent.Item
        title="ani-cli Not Found"
        subtitle="Please install ani-cli to use this extension"
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanelComponent>
            <ActionComponent.OpenInBrowser
              title="View Installation Guide"
              url="https://github.com/pystardust/ani-cli#installation"
              icon={Icon.Book}
            />
            <ActionComponent
              title="Recheck Installation"
              icon={Icon.RotateClockwise}
              onAction={onRecheck}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            {error && (
              <ActionComponent.CopyToClipboard
                title="Copy Error Details"
                content={error.message}
                icon={Icon.Clipboard}
              />
            )}
          </ActionPanelComponent>
        }
        detail={
          <ListComponent.Item.Detail
            markdown={`
# ani-cli Installation Required

This extension requires **ani-cli** to be installed on your system.

## Quick Installation

### Using Homebrew (macOS/Linux):
\`\`\`bash
brew install ani-cli
\`\`\`

### Using curl:
\`\`\`bash
curl -sL github.com/pystardust/ani-cli/raw/master/ani-cli | sudo tee /usr/local/bin/ani-cli > /dev/null && sudo chmod +x /usr/local/bin/ani-cli
\`\`\`

### Manual Installation:
1. Download ani-cli from GitHub
2. Make it executable
3. Add to your PATH

## Troubleshooting

- Make sure ani-cli is in your PATH
- Try running \`ani-cli --help\` in Terminal
- Check the [official repository](https://github.com/pystardust/ani-cli) for more details

${error ? `\n## Error Details\n\`\`\`\n${error.message}\n\`\`\`` : ""}
        `}
          />
        }
      />
    </ListComponent>
  );
}

// Loading component
function LoadingState({ message }: { message: string }) {
  return (
    <ListComponent isLoading={true}>
      <ListComponent.Item title={message} icon={Icon.Gear} />
    </ListComponent>
  );
}

// Empty search state
function EmptySearchState({ query }: { query: string }) {
  const isQueryTooShort = query.trim().length < 2;

  if (isQueryTooShort) {
    return (
      <ListComponent.Item
        title="Start typing to search"
        subtitle="Enter at least 2 characters to search for anime"
        icon={Icon.MagnifyingGlass}
      />
    );
  }

  return (
    <ListComponent.Item
      title="No anime found"
      subtitle={`No results found for "${query}". Try a different search term.`}
      icon={Icon.QuestionMark}
      actions={
        <ActionPanelComponent>
          <ActionComponent.OpenInBrowser
            title="Search on Anilist"
            url={`https://anilist.co/search/anime?search=${encodeURIComponent(query)}`}
            icon={Icon.Globe}
          />
          <ActionComponent.OpenInBrowser
            title="Search on Myanimelist"
            url={`https://myanimelist.net/anime.php?q=${encodeURIComponent(query)}`}
            icon={Icon.MagnifyingGlass}
          />
        </ActionPanelComponent>
      }
    />
  );
}

// Main component
export default function SearchAnime(
  props: LaunchProps<{ arguments: LaunchArgs }>,
) {
  const { animeTitle: initialTitle = "", episode: initialEpisode = "" } =
    props.arguments;

  const [searchQuery, setSearchQuery] = useState(initialTitle);
  const [selectedAnime, setSelectedAnime] = useState<AniListAnime | null>(null);

  // Installation check
  const installationResult = useInstallationCheck();
  const isInstalled = installationResult?.data ?? null;

  const checkingInstallation = installationResult?.isLoading ?? true;
  const installError = installationResult?.error ?? null;
  const recheckInstallation = installationResult?.revalidate ?? (() => {});

  // Search results
  const { data: searchResults = [], isLoading: searching } =
    useAnimeSearch(searchQuery);

  // Show toast for initial episode if provided
  useEffect(() => {
    if (initialEpisode && initialTitle) {
      showToast({
        style: Toast.Style.Success,
        title: "Quick Launch",
        message: `Searching for "${initialTitle}" episode ${initialEpisode}`,
      });
    }
  }, [initialEpisode, initialTitle]);

  const handleAnimeSelect = useCallback((anime: AniListAnime) => {
    setSelectedAnime(anime);
  }, []);

  const handleBackToSearch = useCallback(() => {
    setSelectedAnime(null);
  }, []);

  // Loading state
  if (checkingInstallation || isInstalled === null) {
    return <LoadingState message="Checking ani-cli installation..." />;
  }

  // Installation error state
  if (installError || !isInstalled) {
    return (
      <InstallationError error={installError} onRecheck={recheckInstallation} />
    );
  }

  // Playback form state
  if (selectedAnime) {
    return (
      <PlaybackFormComponent
        selectedAnime={selectedAnime}
        onBack={handleBackToSearch}
      />
    );
  }

  // Search state
  return (
    <ListComponent
      searchBarPlaceholder="Search for anime (e.g., 'Attack on Titan', 'Naruto')"
      onSearchTextChange={setSearchQuery}
      isLoading={searching}
      isShowingDetail={searchResults.length > 0}
      throttle={true}
      searchText={searchQuery}
    >
      {searchQuery.trim().length < 2 ||
      (searchResults.length === 0 && !searching) ? (
        <EmptySearchState query={searchQuery} />
      ) : (
        searchResults.map((anime) => (
          <AnimeListItem
            key={anime.id}
            anime={anime}
            onSelect={handleAnimeSelect}
          />
        ))
      )}
    </ListComponent>
  );
}
