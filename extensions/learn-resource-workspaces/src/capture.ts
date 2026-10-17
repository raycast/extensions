export const CAPTURE_WORKSPACE_KEY = "learn.capture.workspace";

export interface CaptureStore {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

export interface SavedWorkspaceDependencies {
  listWorkspaces: () => Promise<string[]>;
  store: CaptureStore;
  workspaces?: string[];
}

export interface LearnCommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface BrowserCaptureRequest {
  url: string;
  title?: string;
  workspace: string;
}

export interface BrowserCaptureDependencies extends BrowserCaptureRequest {
  runLearn: (args: string[]) => Promise<LearnCommandResult>;
}

export type CaptureResult =
  { status: "saved"; title?: string } | { status: "duplicate" };

export async function getSavedCaptureWorkspace(
  dependencies: SavedWorkspaceDependencies,
): Promise<string | undefined> {
  const savedWorkspace = await dependencies.store.getItem(
    CAPTURE_WORKSPACE_KEY,
  );
  const workspaces =
    dependencies.workspaces || (await dependencies.listWorkspaces());
  return savedWorkspace && workspaces.includes(savedWorkspace)
    ? savedWorkspace
    : undefined;
}

export async function captureBrowserUrl(
  dependencies: BrowserCaptureDependencies,
): Promise<CaptureResult> {
  const result = await dependencies.runLearn([
    "add",
    dependencies.url,
    "--workspace",
    dependencies.workspace,
    ...(dependencies.title ? ["--title", dependencies.title] : []),
  ]);

  if (result.code === 0) {
    return { status: "saved", title: dependencies.title };
  }

  if (result.stderr.includes("already exists")) {
    return { status: "duplicate" };
  }

  throw new Error(
    result.stderr || result.stdout || "Failed to save browser URL",
  );
}
