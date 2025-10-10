// Mock implementation of @raycast/api for testing

export const showToast = jest.fn().mockResolvedValue(undefined);
export const showHUD = jest.fn().mockResolvedValue(undefined);
export const confirmAlert = jest.fn().mockResolvedValue(true);

export const LocalStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
};

export const Toast = {
  Style: {
    Success: 'success',
    Failure: 'failure',
    Animated: 'animated',
  },
};

export const Alert = {
  ActionStyle: {
    Default: 'default',
    Destructive: 'destructive',
    Cancel: 'cancel',
  },
};

export const Action = {
  SubmitForm: jest.fn(),
  OpenInBrowser: jest.fn(),
  CopyToClipboard: jest.fn(),
  Push: jest.fn(),
  Pop: jest.fn(),
  OpenWith: jest.fn(),
};

export const ActionPanel = {
  Section: jest.fn(),
};

export const List = {
  Item: jest.fn(),
  EmptyView: jest.fn(),
  Section: jest.fn(),
};

export const Form = {
  TextArea: jest.fn(),
  TextField: jest.fn(),
  Dropdown: jest.fn(),
  Description: jest.fn(),
  Checkbox: jest.fn(),
  DatePicker: jest.fn(),
  FilePicker: jest.fn(),
  PasswordField: jest.fn(),
  Separator: jest.fn(),
  TagPicker: jest.fn(),
};

export const Detail = {
  Metadata: jest.fn(),
};

export const useNavigation = jest.fn(() => ({
  push: jest.fn(),
  pop: jest.fn(),
}));

export const useCachedState = jest.fn((key: string, initialValue: any) => {
  return [initialValue, jest.fn()];
});

export const useCachedPromise = jest.fn();
export const usePromise = jest.fn();

export const Icon = {
  Plus: '+',
  Minus: '-',
  Check: '✓',
  X: '✗',
  ArrowRight: '→',
  ArrowLeft: '←',
  Refresh: '↻',
  Trash: '🗑',
  Gear: '⚙️',
  QuestionMark: '?',
  ExclamationMark: '!',
  Info: 'ℹ️',
  Warning: '⚠️',
  Heart: '❤️',
  Star: '⭐',
  Bookmark: '🔖',
  Tag: '🏷️',
  Calendar: '📅',
  Clock: '🕐',
  Document: '📄',
  Folder: '📁',
  Download: '⬇️',
  Upload: '⬆️',
  Link: '🔗',
  Eye: '👁️',
  EyeSlash: '🙈',
  Lock: '🔒',
  Unlock: '🔓',
  Key: '🔑',
  Person: '👤',
  People: '👥',
  Message: '💬',
  Mail: '✉️',
  Phone: '📞',
  Video: '📹',
  Camera: '📷',
  Image: '🖼️',
  Music: '🎵',
  Play: '▶️',
  Pause: '⏸️',
  Stop: '⏹️',
  Forward: '⏭️',
  Backward: '⏮️',
  Volume1: '🔉',
  Volume2: '🔊',
  VolumeX: '🔇',
  Search: '🔍',
  Filter: '🔽',
  Sort: '↕️',
  Grid: '⚏',
  List: '☰',
  BarChart: '📊',
  LineChart: '📈',
  PieChart: '🥧',
  Terminal: '💻',
  Code: '</>'
};

export const Color = {
  Red: '#FF0000',
  Orange: '#FFA500',
  Yellow: '#FFFF00',
  Green: '#008000',
  Blue: '#0000FF',
  Purple: '#800080',
  Magenta: '#FF00FF',
  PrimaryText: '#000000',
  SecondaryText: '#666666',
};