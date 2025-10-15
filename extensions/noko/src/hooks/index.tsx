// Optimized hooks
import {
  useApiData,
  useTimers,
  useProjects,
  useTags,
  useEntries as useEntriesApi,
} from "./useApiData";
import { useTimerActions } from "./useTimerActions";
import useElapsedTime from "./useElapsedTime";
import { useEntrySubmission } from "./useEntrySubmission";
import useDetailToggle from "./useDetailToggle";
import useEntries from "./useEntries";

export {
  // Data fetching hooks
  useApiData,
  useTimers,
  useProjects,
  useTags,
  useEntriesApi,
  useEntries,
  // Action hooks
  useTimerActions,
  useElapsedTime,
  useEntrySubmission,
  // UI hooks
  useDetailToggle,
};
