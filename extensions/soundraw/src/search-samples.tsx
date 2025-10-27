import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, List, Detail, Icon, useNavigation, Toast, showHUD } from "@raycast/api";
import * as fs from "fs";
import { execSync } from "child_process";
import { useForm } from "@raycast/utils";
import { runAppleScript } from "run-applescript";
import { searchSamples, getAvailableGenres, SoundrawAPIError } from "./lib/soundraw";
import { hasValidConfig } from "./lib/storage";
import { SearchSamplesRequest, Sample } from "./lib/types";

type Values = {
  genres: string[];
};

// Global runtime state to track which sample is currently playing
// This is ephemeral session state (not persisted to storage.ts)
// Used to coordinate UI across multiple SampleItem instances
const globalPlayingState = {
  sampleId: null as string | null,
  tempPath: undefined as string | undefined,
};

// Global listeners for state changes
const listeners = new Set<(sampleId: string | null) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener(globalPlayingState.sampleId));
}

function SampleItem({ sample }: { sample: Sample }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Listen for global state changes
  useEffect(() => {
    const listener = (sampleId: string | null) => {
      const isCurrentlyPlaying = sampleId === sample.id;
      setIsPlaying(isCurrentlyPlaying);
    };

    listeners.add(listener);
    // Initialize with current global state
    setIsPlaying(globalPlayingState.sampleId === sample.id);

    return () => {
      listeners.delete(listener);
    };
  }, [sample.id]);

  const cleanup = () => {
    // Clean up temp file if it exists (use global tempPath)
    if (globalPlayingState.tempPath) {
      try {
        if (fs.existsSync(globalPlayingState.tempPath)) {
          fs.unlinkSync(globalPlayingState.tempPath);
        }
      } catch (e) {
        console.log("Could not delete temp file:", e);
      }
      globalPlayingState.tempPath = undefined;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only cleanup if this was the currently playing sample
      if (globalPlayingState.sampleId === sample.id) {
        cleanup();
        globalPlayingState.sampleId = null;
      }
    };
  }, [sample.id]);

  const playAudio = async (audioUrl: string) => {
    try {
      console.log("Playing audio:", audioUrl);
      
      // If this sample is already playing, stop it instead
      if (globalPlayingState.sampleId === sample.id) {
        await stopAudio();
        return;
      }

      // Stop any currently playing audio first
      await stopAudio();

      // Update global state
      globalPlayingState.sampleId = sample.id;
      notifyListeners();

      // Download the audio file
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a temporary file
      const tempFileName = `temp_audio_${Date.now()}.m4a`;
      const tempFilePath = `/tmp/${tempFileName}`;

      fs.writeFileSync(tempFilePath, buffer);
      
      // Update global state with temp path
      globalPlayingState.tempPath = tempFilePath;

      // Use AppleScript to play the audio file in QuickTime Player
      const appleScript = `tell application "QuickTime Player"
        activate
        open POSIX file "${tempFilePath}"
        set theMovie to front document
        set looping of theMovie to true
        play theMovie
      end tell`;

      await runAppleScript(appleScript);
    } catch (error) {
      console.error("Failed to play audio:", error);
      
      // Update global state to stop playing
      globalPlayingState.sampleId = null;
      globalPlayingState.tempPath = undefined;
      notifyListeners();
      
      await showToast({
        title: "Playback Failed",
        message: error instanceof Error ? error.message : "Failed to play audio",
        style: Toast.Style.Failure,
      });
    }
  };

  const stopAudio = async () => {
    try {
      const wasPlaying = globalPlayingState.sampleId !== null;
      
      if (wasPlaying) {
        console.log("Stopping audio");
      }
      
      // Use AppleScript to stop QuickTime Player
      const stopScript = `tell application "QuickTime Player"
        if (count of documents) > 0 then
          close front document
        end if
      end tell`;

      await runAppleScript(stopScript);

      // Clean up temp file
      cleanup();

      // Update global state
      globalPlayingState.sampleId = null;
      globalPlayingState.tempPath = undefined;
      notifyListeners();
      
      if (wasPlaying) {
        console.log("Audio stopped successfully");
      }
    } catch (error) {
      console.error("Failed to stop audio:", error);
    }
  };

  const handleCopyAudioFile = async () => {
    setIsDownloading(true);

    try {
      // Show downloading feedback
      showHUD("Downloading audio file...");

      // Download the audio file
      const response = await fetch(sample.sample);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
      }

      const audioBlob = await response.blob();

      // Create a file path in Downloads folder so it persists
      const fileName = `${sample.name.replace(/[^a-zA-Z0-9]/g, "_")}.m4a`;
      const downloadsPath = `${process.env.HOME}/Downloads/${fileName}`;

      // Convert blob to buffer and write to Downloads folder
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Write file to Downloads folder
      fs.writeFileSync(downloadsPath, buffer);

      // Use the system clipboard to copy the file reference
      execSync(`osascript -e 'set the clipboard to (POSIX file "${downloadsPath}")'`);

      // Show success feedback
      showHUD(`Copied ${sample.name} to Downloads`);
    } catch (error) {
      console.error("Failed to copy audio file:", error);
      await showToast({
        title: "Copy Failed",
        message: error instanceof Error ? error.message : "Could not download and copy audio file",
        style: Toast.Style.Failure,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <List.Item
      key={sample.id}
      title={sample.name}
      subtitle={sample.bpm ? `${sample.bpm} BPM` : ""}
      icon={isDownloading ? Icon.Clock : isPlaying ? Icon.SpeakerOn : Icon.Music}
      accessories={[...(sample.bpm ? [{ text: `${sample.bpm} BPM`, icon: Icon.Clock }] : [])]}
      actions={
        <ActionPanel>
          <Action title="Copy Audio File" icon={Icon.Clipboard} onAction={handleCopyAudioFile} />
          <Action.CopyToClipboard content={sample.sample} title="Copy Audio URL" />
          <Action.OpenInBrowser url={sample.sample} title="Open in Browser" />
          {!isPlaying ? (
            <Action
              title="Play Sample"
              icon={Icon.Play}
              onAction={() => playAudio(sample.sample)}
              shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "p" }}
            />
          ) : (
            <Action
              title="Stop Sample"
              icon={Icon.Stop}
              onAction={stopAudio}
              shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "p" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function SamplesList({
  samples,
  isLoading,
  onNewSearch,
}: {
  samples: Sample[];
  isLoading: boolean;
  onNewSearch: () => void;
}) {
  if (isLoading) {
    return (
      <List>
        <List.Item
          title="Searching for samples..."
          subtitle="Please wait while we find matching samples"
          icon={Icon.Clock}
        />
      </List>
    );
  }

  if (samples.length === 0) {
    return (
      <Detail
        markdown="No samples found matching your criteria. Try adjusting your search parameters."
        actions={
          <ActionPanel>
            <Action title="Try Different Search" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      searchBarPlaceholder="Search completed"
      searchBarAccessory={null}
      actions={
        <ActionPanel>
          <Action title="New Search" icon={Icon.MagnifyingGlass} onAction={onNewSearch} />
        </ActionPanel>
      }
    >
      {samples.map((sample) => (
        <SampleItem key={sample.id} sample={sample} />
      ))}
    </List>
  );
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<Record<string, string>>({});
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const { push } = useNavigation();

  // Fetch available genres on component mount
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const configExists = await hasValidConfig();
        if (!configExists) {
          setIsLoadingGenres(false);
          return;
        }

        const response = await getAvailableGenres();
        setAvailableGenres(response.genres);
      } catch (error) {
        console.error("Failed to fetch genres:", error);
        // Set empty genres if API fails
        setAvailableGenres({});
      } finally {
        setIsLoadingGenres(false);
      }
    };

    fetchGenres();
  }, []);

  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: async (values) => {
      const { genres } = values;

      // Check if configuration is set up
      const configExists = await hasValidConfig();
      if (!configExists) {
        await showToast({
          title: "No API Configuration",
          message: "Please set up your Soundraw API configuration first",
          style: Toast.Style.Failure,
        });
        push("setup-token");
        return;
      }

      setIsLoading(true);
      setHasSearched(true);

      try {
        const searchParams: SearchSamplesRequest = {
          genres: genres || [],
          page: 1,
          limit: 20,
        };

        const response = await searchSamples(searchParams);
        setSamples(response.samples);

        await showToast({
          title: "Search Complete",
        });
      } catch (error) {
        const errorMessage =
          error instanceof SoundrawAPIError ? error.message : "Failed to search samples. Please try again.";

        await showToast({
          title: "Search Failed",
          message: errorMessage,
          style: Toast.Style.Failure,
        });
        setSamples([]);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      genres: (value) => {
        if (!value || value.length === 0) {
          return "Please select at least one genre";
        }
      },
    },
  });

  const handleNewSearch = () => {
    setHasSearched(false);
    setSamples([]);
  };

  if (hasSearched) {
    return <SamplesList samples={samples} isLoading={isLoading} onNewSearch={handleNewSearch} />;
  }

  return (
    <Form
      isLoading={isLoading || isLoadingGenres}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Search Samples" />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        title="Genres"
        placeholder="Select genres to search"
        info="Choose one or more genres to find matching samples"
        {...itemProps.genres}
      >
        {Object.entries(availableGenres).map(([key, value]) => (
          <Form.TagPicker.Item key={key} title={value} value={key} />
        ))}
      </Form.TagPicker>

      {isLoadingGenres && <Form.Description text="Loading available genres..." />}

      {!isLoadingGenres && Object.keys(availableGenres).length === 0 && (
        <Form.Description text="No genres available. Please check your API connection." />
      )}
    </Form>
  );
}
