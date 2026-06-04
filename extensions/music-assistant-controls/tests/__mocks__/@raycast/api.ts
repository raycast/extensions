export const getPreferenceValues = jest.fn(() => ({
  host: "http://localhost:8095",
  token: "token-123",
  volumeStep: "10",
}));

export const showToast = jest.fn();
export const showHUD = jest.fn();
export const launchCommand = jest.fn();

export const Color = {
  Blue: "blue",
  Green: "green",
  Purple: "purple",
  Orange: "orange",
};

export const Icon = {
  ArrowClockwise: "arrow-clockwise",
  ArrowDown: "arrow-down",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  ArrowUp: "arrow-up",
  Cd: "cd",
  CheckCircle: "check-circle",
  Circle: "circle",
  Clock: "clock",
  Dot: "dot",
  Folder: "folder",
  Gear: "gear",
  Info: "info",
  Layers: "layers",
  List: "list",
  Minus: "minus",
  Music: "music",
  Pause: "pause",
  Person: "person",
  Play: "play",
  Plus: "plus",
  PlusSquare: "plus-square",
  SpeakerHigh: "speaker-high",
  SpeakerOff: "speaker-off",
  SpeakerOn: "speaker-on",
  Terminal: "terminal",
  Trash: "trash",
  TwoPeople: "two-people",
  XMarkCircle: "x-mark-circle",
};

export const Image = {
  Mask: {
    RoundedRectangle: "rounded-rectangle",
  },
};

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
    Loading: "loading",
  },
};

export const LocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

export const LaunchType = {
  UserInitiated: "UserInitiated",
};
