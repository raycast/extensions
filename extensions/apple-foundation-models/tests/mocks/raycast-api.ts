// Only what src/lib uses from @raycast/api. Tests change `mockState` to simulate the selection and clipboard.
export const mockState: {
  selectedText?: string;
  clipboardText?: string;
  clipboardFile?: string;
  finderPaths?: string[];
  frontmostBundleId?: string;
  preferences: Record<string, unknown>;
} = { preferences: {} };

export function resetMockState() {
  mockState.selectedText = undefined;
  mockState.clipboardText = undefined;
  mockState.clipboardFile = undefined;
  mockState.finderPaths = undefined;
  mockState.frontmostBundleId = undefined;
  mockState.preferences = {};
}

export const environment = { supportPath: "/tmp/apple-foundation-models-test" };
export const getPreferenceValues = () => mockState.preferences;

export async function getSelectedText(): Promise<string> {
  if (mockState.selectedText === undefined) throw new Error("Unable to get selected text");
  return mockState.selectedText;
}

export async function getFrontmostApplication(): Promise<{ bundleId?: string }> {
  return { bundleId: mockState.frontmostBundleId };
}

export async function getSelectedFinderItems(): Promise<{ path: string }[]> {
  if (mockState.finderPaths === undefined) throw new Error("Finder is not the frontmost application");
  return mockState.finderPaths.map((path) => ({ path }));
}

export const Clipboard = {
  async readText(): Promise<string | undefined> {
    return mockState.clipboardText;
  },
  async read(): Promise<{ text: string; file?: string }> {
    return { text: mockState.clipboardText ?? "", file: mockState.clipboardFile };
  },
};
