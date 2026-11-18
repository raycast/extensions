import { vi } from "vitest";

export const environment = {
  isDevelopment: true,
  extensionName: "tesla-clips",
  commandMode: "view",
  launchType: "userInitiated",
  textSize: "medium",
  appearance: "light",
  canAccess: vi.fn(() => true),
};

export const Color = {
  Blue: "blue",
  Green: "green",
  Yellow: "yellow",
  Red: "red",
  SecondaryText: "secondary-text",
};

export const Icon = {
  Circle: "circle",
  CheckCircle: "check-circle",
  XMarkCircle: "x-mark-circle",
  Warning: "warning",
  Video: "video",
  Folder: "folder",
  Finder: "finder",
  ArrowClockwise: "arrow-clockwise",
  Play: "play",
  BulletPoints: "bullet-points",
  MagnifyingGlass: "magnifying-glass",
  CircleProgress25: "circle-progress-25",
  CircleProgress: "circle-progress",
  CircleProgress100: "circle-progress-100",
  ExclamationMark: "exclamation-mark",
  Document: "document",
  Eye: "eye",
  ArrowCounterClockwise: "arrow-counter-clockwise",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  ChevronRight: "chevron-right",
  Info: "info",
  Clock: "clock",
  Layers: "layers",
  List: "list",
  BarChart: "bar-chart",
  Trash: "trash",
  Dot: "dot",
};

export const Toast = {
  Style: {
    Animated: "animated",
    Success: "success",
    Failure: "failure",
  },
};

export const getPreferenceValues = vi.fn(() => ({
  enableDebugLogging: false,
  ffmpegPath: "ffmpeg",
}));

export const getSelectedFinderItems = vi.fn(async () => []);

export const showToast = vi.fn(async () => ({
  style: "",
  title: "",
  message: "",
}));

export const open = vi.fn(async () => undefined);
export const trash = vi.fn(async () => undefined);
export const confirmAlert = vi.fn(async () => true);

export const useNavigation = vi.fn(() => ({
  push: vi.fn(),
  pop: vi.fn(),
}));

export const List = Object.assign(() => null, {
  Item: Object.assign(() => null, { Detail: () => null }),
  Section: () => null,
  EmptyView: () => null,
});

export const Action = Object.assign(() => null, {
  Panel: Object.assign(() => null, { Section: () => null }),
  Push: () => null,
  Style: {
    Destructive: "destructive",
  },
});

export const Form = {
  FilePicker: () => null,
};
