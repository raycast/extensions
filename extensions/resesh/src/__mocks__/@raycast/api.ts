/* eslint-disable @typescript-eslint/no-explicit-any */
export const getPreferenceValues = vi.fn(() => ({}));
export const showToast = vi.fn(() => Promise.resolve());
export const showInFinder = vi.fn(() => Promise.resolve());

export const Clipboard = { copy: vi.fn(() => Promise.resolve()) };

export const Toast = {
  Style: { Success: "SUCCESS", Failure: "FAILURE", Animated: "ANIMATED" },
};

export const Icon = new Proxy({} as Record<string, string>, { get: (_, key) => String(key) });
export const Color = new Proxy({} as Record<string, string>, { get: (_, key) => String(key) });

export const Action: any = Object.assign(() => null, { Style: {} });
export const ActionPanel: any = () => null;
export const List: any = Object.assign(() => null, {
  Item: Object.assign(() => null, { Detail: () => null }),
  Section: () => null,
  Dropdown: Object.assign(() => null, {
    Item: () => null,
    Section: () => null,
  }),
  EmptyView: () => null,
});
