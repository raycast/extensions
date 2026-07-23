export interface BrowsePromptsLaunchContext {
  promptId: string;
}

export function browsePromptsLaunchContext(promptId: string): BrowsePromptsLaunchContext {
  return { promptId };
}
