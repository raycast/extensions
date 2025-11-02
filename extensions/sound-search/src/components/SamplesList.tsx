import { useState, useEffect, useRef, type ComponentProps } from "react";
import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { Sample } from "../lib/types";
import { playAudio, stopAudio, cleanupPlayback } from "../lib/audio";
import { getOrDownloadFile, getExpectedFilePath } from "../lib/file";
import { SampleItem } from "./SampleItem";
import * as fs from "fs";
import { log } from "../lib/log";

export function SamplesList({
  samples,
  isLoading,
  onNewSearch,
  selectedGenres,
  availableGenres,
  searchBarAccessory,
  navigationTitle: customNavigationTitle,
}: {
  samples: Sample[];
  isLoading: boolean;
  onNewSearch: () => void;
  selectedGenres: string[];
  availableGenres: Record<string, string>;
  searchBarAccessory?: ComponentProps<typeof List>["searchBarAccessory"];
  navigationTitle?: string;
}) {
  const genreNames = selectedGenres.map((key) => availableGenres[key] || key).join(", ");
  const navigationTitle = customNavigationTitle || (genreNames ? `Search Samples: ${genreNames}` : "Search Samples");
  const selectedSampleIdRef = useRef<string | null>(null);
  const [filePaths, setFilePaths] = useState<Record<string, string>>({});
  const [isPreparingFiles, setIsPreparingFiles] = useState(false);

  // Prepare all sample files for drag and drop when samples change
  useEffect(() => {
    let cancelled = false;

    const prepareFiles = async () => {
      if (samples.length === 0) {
        setFilePaths({});
        setIsPreparingFiles(false);
        return;
      }

      setIsPreparingFiles(true);
      log.debug(`[drag-drop] preparing ${samples.length} files for drag and drop`);

      // Use Promise.allSettled to ensure all files are attempted even if some fail
      const preparePromises = samples.map(async (sample) => {
        try {
          // Check if file already exists (from previous play/copy action)
          const expectedPath = getExpectedFilePath(sample.sample, sample.name, null, "/tmp");
          if (fs.existsSync(expectedPath)) {
            // Verify file is readable and has content
            const stats = fs.statSync(expectedPath);
            if (stats.size > 0) {
              log.debug(`[drag-drop] file exists: ${sample.name} (${stats.size} bytes)`);
              return { sampleId: sample.id, path: expectedPath };
            } else {
              log.debug(`[drag-drop] file exists but is empty, re-downloading: ${sample.name}`);
            }
          }

          // Download and cache if needed (uses cache if available)
          const { path } = await getOrDownloadFile(sample.sample, "/tmp", sample.name);

          // Verify file was created successfully
          if (fs.existsSync(path)) {
            const stats = fs.statSync(path);
            if (stats.size > 0) {
              log.debug(`[drag-drop] file ready: ${sample.name} (${stats.size} bytes)`);
              return { sampleId: sample.id, path };
            } else {
              log.debug(`[drag-drop] file created but is empty: ${sample.name}`);
              return null;
            }
          } else {
            log.debug(`[drag-drop] file was not created: ${sample.name}`);
            return null;
          }
        } catch (error) {
          log.debug(
            `[drag-drop] failed to prepare file for ${sample.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          return null;
        }
      });

      const results = await Promise.allSettled(preparePromises);

      if (cancelled) {
        return;
      }

      // Build paths object from successful results
      const paths: Record<string, string> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          paths[result.value.sampleId] = result.value.path;
        } else if (result.status === "rejected") {
          log.debug(`[drag-drop] promise rejected for sample ${samples[index]?.name}`);
        }
      });

      setFilePaths(paths);
      setIsPreparingFiles(false);
      log.debug(`[drag-drop] prepared ${Object.keys(paths).length}/${samples.length} files`);
    };

    prepareFiles();

    return () => {
      cancelled = true;
    };
  }, [samples]);

  // Cleanup audio playback when this component unmounts
  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, []);

  const handleSelectionChange = async (selectedId: string | null) => {
    // If no selection or same sample, do nothing
    if (!selectedId || selectedId === selectedSampleIdRef.current) {
      return;
    }

    log.debug(`[audio] selection changed: ${selectedId} (was: ${selectedSampleIdRef.current})`);
    selectedSampleIdRef.current = selectedId;

    try {
      // Stop currently playing sample
      await stopAudio();

      // Find the selected sample and play it
      const selectedSample = samples.find((s) => s.id === selectedId);
      if (selectedSample) {
        log.debug(`[audio] auto-playing selected sample: ${selectedSample.name}`);
        await playAudio(selectedSample.sample, selectedSample.id, selectedSample.name);
        // Don't save to recents on auto-play - only save when explicitly playing via PlayStopAction
      }
    } catch (error) {
      log.debug(
        `[audio] failed to auto-play selected sample: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      // Don't show toast for auto-play failures, just log
    }
  };

  return (
    <List
      isLoading={isLoading || isPreparingFiles}
      navigationTitle={navigationTitle}
      searchBarAccessory={searchBarAccessory}
      onSelectionChange={handleSelectionChange}
      actions={
        <ActionPanel>
          <Action title="New Search" icon={Icon.MagnifyingGlass} onAction={onNewSearch} />
        </ActionPanel>
      }
    >
      {!isLoading && samples.length === 0 ? (
        <List.EmptyView
          title="No samples found"
          description="No samples found matching your criteria. Try adjusting your search parameters."
          actions={
            <ActionPanel>
              <Action title="Try Different Search" onAction={onNewSearch} />
            </ActionPanel>
          }
        />
      ) : (
        samples.map((sample) => <SampleItem key={sample.id} sample={sample} filePath={filePaths[sample.id] || null} />)
      )}
    </List>
  );
}
