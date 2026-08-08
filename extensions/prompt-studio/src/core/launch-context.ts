export interface BrowsePromptsLaunchContext {
  promptId: string;
}

export function browsePromptsLaunchContext(promptId: string): BrowsePromptsLaunchContext {
  return { promptId };
}

export function retainPromptSelectionWhileLoading(
  currentId: string | null,
  nextId: string | null,
  isLoading: boolean,
): string | null {
  return isLoading && nextId === null ? currentId : nextId;
}
