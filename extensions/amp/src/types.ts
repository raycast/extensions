export type AmpMode = "low" | "medium" | "high" | "ultra";

export type AmpVisibility = "private" | "unlisted" | "workspace" | "group";

export interface AmpProject {
  id: string;
  name: string;
  namespace: string;
  repositoryURL: string;
}

export interface BrowserContext {
  title?: string;
  url?: string;
  markdown?: string;
}

export interface NativeContext {
  capturedAt: string;
  application?: {
    name: string;
    bundleId?: string;
    path?: string;
  };
  window?: {
    id?: string;
    title?: string;
    bounds?: string;
  };
  selectedText?: string;
  selectedFinderItems?: string[];
  browser?: BrowserContext;
}

export interface CaptureEntry {
  id: string;
  path: string;
  createdAt: string;
  context: NativeContext;
}

/**
 * Amp accepts only text and image content blocks, so every attachment is sent
 * as one or the other: images inline as image blocks, anything else inlines as
 * text.
 */
export interface ThreadAttachment {
  path: string;
  kind: "image" | "text";
}

export interface TrackedRun {
  runId: string;
  createdAt: string;
  promptPreview: string;
  project?: AmpProject;
  mode: AmpMode;
  visibility?: AmpVisibility;
  runDirectory: string;
}

export interface AmpThreadSummary {
  id: string;
  title: string;
  updated?: string;
  messageCount?: number;
}

export interface LiveAmpThread {
  id: string;
  title: string;
  url: string;
  project?: string;
  status?: string;
  updatedAt?: string;
  working: boolean;
  executorConnected: boolean;
}
