// __mocks__/raycast-api.ts
export const Icon = {
  Weights: "weights",
  ExclamationMark: "exclamation-mark",
  Person: "person",
  LightBulb: "light-bulb",
  Clock: "clock",
  Circle: "circle",
  Stars: "stars",
  Sidebar: "sidebar",
  CopyClipboard: "copy-clipboard",
};

export const Color = {
  Red: "red",
  Orange: "orange",
  Yellow: "yellow",
  Green: "green",
  Blue: "blue",
  Purple: "purple",
  SecondaryText: "secondary-text",
};

export const Toast = {
  Style: {
    Failure: "failure",
    Success: "success",
  },
};


export const List = {
  EmptyView: jest.fn(),
  Item: jest.fn().mockReturnValue({
    Detail: jest.fn().mockReturnValue({
      Metadata: {
        Label: jest.fn(),
        Link: jest.fn(),
        Separator: jest.fn(),
      },
    }),
  }),
  Section: jest.fn(),
  isShowingDetail: false,
  onSearchTextChange: jest.fn(),
  searchBarPlaceholder: "",
  searchText: "",
};

export const showToast = jest.fn();
export const getPreferenceValues = jest.fn(() => ({
  unitSystem: "kg",
}));
export const Clipboard = {
  copy: jest.fn(),
};
