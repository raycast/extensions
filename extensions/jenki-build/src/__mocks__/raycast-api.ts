/* eslint-disable @typescript-eslint/no-explicit-any */
// Mock for @raycast/api — used by vitest to prevent resolution failures
// fetchJobTree is not tested in unit tests; only pure functions are tested.
export function getPreferenceValues<T>(): T {
  return {
    jenkinsUrl: "http://jenkins",
    username: "user",
    apiToken: "token",
  } as unknown as T;
}

export const Icon = {
  CheckCircle: "check-circle",
  XMarkCircle: "xmark-circle",
  CircleProgress: "circle-progress",
  MinusCircle: "minus-circle",
  Circle: "circle",
  Play: "play",
  Star: "star",
  StarDisabled: "star-disabled",
  Clock: "clock",
} as const;

export const Color = {
  Green: "green",
  Red: "red",
  Blue: "blue",
  Orange: "orange",
  SecondaryText: "secondary-text",
} as const;

export const List = {
  Item: {} as any,
  Section: {} as any,
  EmptyView: {} as any,
};

export const ActionPanel = {} as any;
export const Action = {} as any;
export const Form = {} as any;
export const Toast = {
  Style: { Failure: "failure", Success: "success", Animated: "animated" },
};
export function showToast() {}
export function useNavigation() {
  return { push: () => {}, pop: () => {} };
}
export function open() {}
