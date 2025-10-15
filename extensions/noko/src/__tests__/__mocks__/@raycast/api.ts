// Mock for @raycast/api
export const showToast = jest.fn();
export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Animated: "animated",
  },
};

export const getPreferenceValues = jest.fn(() => ({
  personalAccessToken: "mock-token",
  timezone: "America/Mexico_City",
}));

export const Form = {
  TextField: jest.fn(),
  Dropdown: jest.fn(),
  DatePicker: jest.fn(),
  TagPicker: jest.fn(),
  TextArea: jest.fn(),
};

export const List = {
  Item: {
    Detail: {
      Metadata: {
        Label: jest.fn(),
        Separator: jest.fn(),
      },
    },
  },
};

export const ActionPanel = jest.fn();
export const Action = {
  Style: {
    Destructive: "destructive",
  },
};

export const Icon = {
  Play: "play",
  Pause: "pause",
  Stop: "stop",
  Trash: "trash",
  CircleFilled: "circle-filled",
};

export const LaunchProps = {
  launchContext: {},
};

// Mock components
export const ErrorBoundary = ({ children }: { children: React.ReactNode }) =>
  children;
