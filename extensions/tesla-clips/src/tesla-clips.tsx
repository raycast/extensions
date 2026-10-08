/**
 * Main Raycast command entry: initializes sources, scans clips, and hosts the event browser.
 *
 * @module tesla-clips
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  CleanupReviewNavigator,
  CleanupRunView,
  EventList,
  FolderPicker,
  MergeReviewNavigator,
  MergeRunView,
} from "./components";
import { wrapWithNavigationStack } from "./context/navigation-stack-context";
import { useClipScanner, useCommandNavigation } from "./hooks";
import {
  cleanPath,
  confirmDeleteSourceSegments,
  getCleanupTargetEvents,
  getUserFriendlyMessage,
  logger,
  resolveFfmpegExecutable,
  resolveFinderSourceRoots,
  validateMergePaths,
} from "./lib";
import type { EventMergeResult, MergeOptions, TeslaEvent } from "./types";

const EMPTY_EVENT_STATUSES: Map<string, EventMergeResult> = new Map();

/**
 * Root command view. Resolves source folders and ffmpeg, scans events, and routes to
 * folder picker, event list, merge review, or cleanup review via Raycast navigation.
 *
 * @returns Folder picker, or the main {@link EventList} with merge/cleanup actions.
 */
export default function Command() {
  const preferences = getPreferenceValues<Preferences.TeslaClips>();
  const navigation = useCommandNavigation();
  const { pushView, popToRootView } = navigation;
  const wrapNavigation = useCallback(
    (component: ReactElement) => wrapWithNavigationStack(navigation, component),
    [navigation],
  );
  const [roots, setRoots] = useState<string[]>([]);
  const [rootsLoading, setRootsLoading] = useState(true);
  const [needsFolderPicker, setNeedsFolderPicker] = useState(false);
  const [resolvedFfmpeg, setResolvedFfmpeg] = useState<string | undefined>();

  const outputRootPath = cleanPath(preferences.outputRootPath);

  const loadRoots = useCallback(async () => {
    logger.info("Initializing Tesla Clips command");
    try {
      const defaultSourcePath = cleanPath(preferences.defaultSourcePath);
      logger.debug("Resolving source roots", { defaultSourcePath });

      const initialRoots = await resolveFinderSourceRoots(defaultSourcePath);
      logger.debug("Resolved source roots", { count: initialRoots.length, roots: initialRoots });

      if (initialRoots.length === 0) {
        logger.info("No source roots found, showing folder picker");
        setNeedsFolderPicker(true);
      } else {
        await validateMergePaths(initialRoots, outputRootPath);
        setRoots(initialRoots);
      }

      logger.debug("Resolving ffmpeg executable");
      const ffmpeg = await resolveFfmpegExecutable(cleanPath(preferences.ffmpegPath));
      logger.debug("Resolved ffmpeg", { ffmpegPath: ffmpeg });
      setResolvedFfmpeg(ffmpeg);
    } catch (error) {
      logger.error("Initialization failed", { error: error instanceof Error ? error.message : String(error) });
      await showFailureToast(getUserFriendlyMessage(error), { title: "Initialization failed" });
    } finally {
      setRootsLoading(false);
    }
  }, [preferences.defaultSourcePath, preferences.ffmpegPath, outputRootPath]);

  useEffect(() => {
    loadRoots();
  }, [loadRoots]);

  const handleFoldersSelected = useCallback((selectedRoots: string[]) => {
    logger.info("Folders selected from picker", { count: selectedRoots.length, roots: selectedRoots });
    setRoots(selectedRoots);
    setNeedsFolderPicker(false);
  }, []);

  const {
    events,
    isLoading: scanLoading,
    lastError: scanError,
    scanSummary,
    refresh,
  } = useClipScanner(roots, outputRootPath);

  const mergeOptions: MergeOptions = useMemo(() => {
    const base = {
      ffmpegPath: resolvedFfmpeg ?? "ffmpeg",
      overwriteExisting: preferences.overwriteExisting,
      deleteSourceSegmentsAfterMerge: preferences.deleteSourceSegmentsAfterMerge,
    };
    return outputRootPath !== undefined ? { ...base, outputRootPath } : base;
  }, [resolvedFfmpeg, outputRootPath, preferences.overwriteExisting, preferences.deleteSourceSegmentsAfterMerge]);

  const openMergeRun = useCallback(
    (targetEvents: TeslaEvent[], options: MergeOptions) => {
      pushView(
        wrapNavigation(
          <MergeRunView
            events={targetEvents}
            mergeOptions={options}
            openOutputWhenDone={preferences.openOutputWhenDone}
            onDismiss={popToRootView}
          />,
        ),
        () => void refresh(),
      );
    },
    [preferences.openOutputWhenDone, popToRootView, pushView, refresh, wrapNavigation],
  );

  const openCleanupRun = useCallback(
    (targetEvents: TeslaEvent[]) => {
      pushView(
        wrapNavigation(
          <CleanupRunView
            events={targetEvents}
            {...(outputRootPath !== undefined ? { outputRootPath } : {})}
            onDismiss={popToRootView}
          />,
        ),
        () => void refresh(),
      );
    },
    [outputRootPath, popToRootView, pushView, refresh, wrapNavigation],
  );

  const openCleanupReview = useCallback(async () => {
    const targetEvents = getCleanupTargetEvents(events);
    if (targetEvents.length === 0) {
      await showFailureToast("No merged output folders remain to remove.", { title: "Nothing to remove" });
      return;
    }

    pushView(
      wrapNavigation(
        <CleanupReviewNavigator
          events={targetEvents}
          ffmpegPath={mergeOptions.ffmpegPath}
          onStartRun={(selectedEvents) => {
            if (selectedEvents.length === 0) {
              return;
            }
            openCleanupRun([...selectedEvents]);
          }}
        />,
      ),
    );
  }, [events, mergeOptions.ffmpegPath, openCleanupRun, pushView, wrapNavigation]);

  const openMergeReview = useCallback(
    (targetEvents: TeslaEvent[]) => {
      pushView(
        wrapNavigation(
          <MergeReviewNavigator
            events={targetEvents}
            mergeOptions={mergeOptions}
            ffmpegPath={mergeOptions.ffmpegPath}
            onConfirm={async (overwriteOutputs) => {
              const reviewOptions: MergeOptions = {
                ...mergeOptions,
                overwriteOutputs,
              };

              const confirmed = await confirmDeleteSourceSegments(reviewOptions);
              if (!confirmed) {
                return;
              }

              openMergeRun(targetEvents, reviewOptions);
            }}
          />,
        ),
      );
    },
    [mergeOptions, openMergeRun, pushView, wrapNavigation],
  );

  const startMergeFlow = useCallback(
    (targetEvents: TeslaEvent[]) => {
      if (targetEvents.length === 0) {
        return;
      }

      openMergeReview(targetEvents);
    },
    [openMergeReview],
  );

  const handleMergeEvent = useCallback((event: TeslaEvent) => startMergeFlow([event]), [startMergeFlow]);

  const handleMergeAll = useCallback(() => startMergeFlow(events), [events, startMergeFlow]);

  const handleSelectFolders = useCallback(() => {
    logger.debug("Switching to folder picker");
    setNeedsFolderPicker(true);
  }, []);

  if (needsFolderPicker && !rootsLoading) {
    return (
      <FolderPicker
        onFoldersSelected={handleFoldersSelected}
        {...(roots.length > 0 ? { onCancel: () => setNeedsFolderPicker(false) } : {})}
      />
    );
  }

  return (
    <EventList
      events={events}
      isLoading={rootsLoading || scanLoading}
      scanError={scanError}
      scanSummary={scanSummary}
      eventStatuses={EMPTY_EVENT_STATUSES}
      mergingEventId={undefined}
      isMerging={false}
      onMergeEvent={handleMergeEvent}
      onMergeAll={handleMergeAll}
      onRefresh={refresh}
      mergeOptions={mergeOptions}
      onSelectFolders={handleSelectFolders}
      onOpenCleanupReview={openCleanupReview}
    />
  );
}
