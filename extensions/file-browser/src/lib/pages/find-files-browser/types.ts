import type { FindFilesSearchArtifact } from "$lib/pages/find-files-browser/logic/types";
import type {
  AccessoryFlags,
  ContentsSortMode,
  ContentsViewMode,
  EnterKeyAction,
} from "$lib/components/contents/types";

export type FindFilesBrowserProps = {
  /** The search query string. */
  query: string;
  /**
   * Start-directory preference / input scope for the search.
   * Passed at invocation time; the resolved scope comes from
   * `artifact.scopePath` after `executeSearch()` completes.
   */
  scopePath?: string;
  /**
   * Optional pre-built artifact to execute immediately, bypassing AI generation.
   * Used when launching from history-row Edit Search to preserve the user's edited
   * predicate, scope, and interpretation without regeneration.
   */
  initialArtifact?: FindFilesSearchArtifact;
  initialView?: ContentsViewMode;
  initialSort?: ContentsSortMode;
  gridColumns?: number;
  enabledAccessories?: AccessoryFlags;
  /**
   * Optional callback invoked after an artifact is successfully generated via AI.
   * Not invoked when `initialArtifact` is provided directly.  Allows the caller to
   * persist the generated artifact (with real predicate/scope) to history without
   * storing the placeholder that was pushed before launching FindFilesBrowser.
   */
  onArtifactGenerated?: (artifact: FindFilesSearchArtifact) => void;
  enterAction?: EnterKeyAction;
};
