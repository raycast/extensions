import { Icon, Image } from "@raycast/api";

export interface SfSymbolOption {
  /** SF Symbol name passed to the FlashSpace CLI (e.g. "globe"). */
  value: string;
  /** Human-readable label shown in the picker (e.g. "Globe"). */
  label: string;
  /** Raycast icon rendered next to the label in the dropdown. */
  icon: Image.ImageLike;
}

/**
 * Curated list of SF Symbol names with matching Raycast icons.
 * Ordering: loosely grouped by theme so the searchable dropdown feels organised.
 */
export const SF_SYMBOL_OPTIONS: SfSymbolOption[] = [
  // Navigation & System
  { value: "globe", label: "Globe", icon: Icon.Globe },
  { value: "house", label: "Home", icon: Icon.House },
  { value: "gear", label: "Settings", icon: Icon.Gear },
  { value: "magnifyingglass", label: "Search", icon: Icon.MagnifyingGlass },
  { value: "bookmark", label: "Bookmark", icon: Icon.Bookmark },
  { value: "tag", label: "Tag", icon: Icon.Tag },
  { value: "flag", label: "Flag", icon: Icon.Flag },
  { value: "star", label: "Star", icon: Icon.Star },
  { value: "heart", label: "Heart", icon: Icon.Heart },
  { value: "folder", label: "Folder", icon: Icon.Folder },
  { value: "trash", label: "Trash", icon: Icon.Trash },
  { value: "pin", label: "Pin", icon: Icon.Pin },
  { value: "eye", label: "Eye", icon: Icon.Eye },
  // Security
  { value: "lock", label: "Lock", icon: Icon.Lock },
  { value: "lock.open", label: "Unlock", icon: Icon.LockUnlocked },
  { value: "key", label: "Key", icon: Icon.Key },
  { value: "shield", label: "Shield", icon: Icon.Shield },
  // Development & Tech
  { value: "apple.terminal", label: "Terminal", icon: Icon.Terminal },
  { value: "keyboard", label: "Keyboard", icon: Icon.Keyboard },
  { value: "command", label: "Command", icon: Icon.CommandSymbol },
  { value: "hammer", label: "Hammer / Build", icon: Icon.Hammer },
  { value: "wrench.and.screwdriver", label: "Tools", icon: Icon.WrenchScrewdriver },
  { value: "network", label: "Network", icon: Icon.Network },
  { value: "wifi", label: "Wi-Fi", icon: Icon.Wifi },
  { value: "cloud", label: "Cloud", icon: Icon.Cloud },
  { value: "desktopcomputer", label: "Desktop", icon: Icon.Desktop },
  { value: "display", label: "Monitor", icon: Icon.Monitor },
  { value: "cpu", label: "CPU", icon: Icon.ComputerChip },
  { value: "memorychip", label: "Memory", icon: Icon.MemoryChip },
  // Communication
  { value: "message", label: "Message", icon: Icon.Message },
  { value: "envelope", label: "Email", icon: Icon.Envelope },
  { value: "phone", label: "Phone", icon: Icon.Phone },
  { value: "mic", label: "Microphone", icon: Icon.Microphone },
  { value: "video", label: "Video", icon: Icon.Video },
  { value: "megaphone", label: "Megaphone", icon: Icon.Megaphone },
  // Media & Entertainment
  { value: "play", label: "Play", icon: Icon.Play },
  { value: "pause", label: "Pause", icon: Icon.Pause },
  { value: "stop", label: "Stop", icon: Icon.Stop },
  { value: "forward.fill", label: "Forward", icon: Icon.Forward },
  { value: "backward.fill", label: "Backward", icon: Icon.Rewind },
  { value: "music.note", label: "Music", icon: Icon.Music },
  { value: "headphones", label: "Headphones", icon: Icon.Headphones },
  { value: "speaker.wave.2", label: "Audio / Speaker", icon: Icon.SpeakerHigh },
  { value: "movieclapper", label: "Film / Movies", icon: Icon.FilmStrip },
  { value: "gamecontroller", label: "Games", icon: Icon.GameController },
  { value: "photo", label: "Photo", icon: Icon.Image },
  { value: "camera", label: "Camera", icon: Icon.Camera },
  // Documents & Work
  { value: "doc", label: "Document", icon: Icon.Document },
  { value: "text.book.closed", label: "Book", icon: Icon.Book },
  { value: "pencil", label: "Edit / Pencil", icon: Icon.Pencil },
  { value: "paperclip", label: "Paperclip", icon: Icon.Paperclip },
  { value: "clipboard", label: "Clipboard", icon: Icon.Clipboard },
  { value: "calendar", label: "Calendar", icon: Icon.Calendar },
  { value: "chart.bar", label: "Bar Chart", icon: Icon.BarChart },
  { value: "chartpie", label: "Pie Chart", icon: Icon.PieChart },
  { value: "list.bullet", label: "List", icon: Icon.BulletPoints },
  // People & Places
  { value: "person", label: "Person", icon: Icon.Person },
  { value: "person.2", label: "People / Team", icon: Icon.PersonLines },
  { value: "person.crop.circle", label: "Profile", icon: Icon.PersonCircle },
  { value: "building.2", label: "Building", icon: Icon.Building },
  { value: "map", label: "Map", icon: Icon.Map },
  // Nature & Misc
  { value: "moon", label: "Moon / Night", icon: Icon.Moon },
  { value: "sun.max", label: "Sun / Brightness", icon: Icon.Sun },
  { value: "bolt", label: "Lightning / Quick", icon: Icon.Bolt },
  { value: "leaf", label: "Leaf", icon: Icon.Leaf },
  { value: "tree", label: "Tree", icon: Icon.Tree },
  { value: "flame", label: "Flame", icon: Icon.Torch },
  // Status & Navigation
  { value: "info.circle", label: "Info", icon: Icon.Info },
  { value: "checkmark.circle", label: "Checkmark", icon: Icon.CheckCircle },
  { value: "xmark.circle", label: "Close / Remove", icon: Icon.XMarkCircle },
  { value: "exclamationmark.circle", label: "Alert", icon: Icon.ExclamationMark },
  { value: "questionmark.circle", label: "Help / Question", icon: Icon.QuestionMarkCircle },
  { value: "arrow.clockwise", label: "Refresh", icon: Icon.ArrowClockwise },
  { value: "arrow.right", label: "Arrow Right", icon: Icon.ArrowRight },
  { value: "arrow.up", label: "Arrow Up", icon: Icon.ArrowUp },
  { value: "arrow.down", label: "Arrow Down", icon: Icon.ArrowDown },
  // System & Power
  { value: "poweroutlet.type.a", label: "Power", icon: Icon.Power },
  { value: "clock", label: "Clock", icon: Icon.Clock },
  { value: "stopwatch", label: "Stopwatch", icon: Icon.Stopwatch },
  { value: "rocket", label: "Rocket", icon: Icon.Rocket },
  { value: "wand.and.stars", label: "Magic / Wand", icon: Icon.Wand },
  // Finance & Shopping
  { value: "creditcard", label: "Credit Card", icon: Icon.CreditCard },
  { value: "gift", label: "Gift", icon: Icon.Gift },
  { value: "cart", label: "Shopping / Cart", icon: Icon.Cart },
];
