import { Icon } from "@raycast/api";

export interface WorkspaceIconOption {
  icon: Icon;
  name: string;
  category: string;
}

export const WORKSPACE_ICONS: WorkspaceIconOption[] = [
  // General
  { icon: Icon.Folder, name: "Folder", category: "General" },
  { icon: Icon.House, name: "Home", category: "General" },
  { icon: Icon.Star, name: "Star", category: "General" },
  { icon: Icon.Heart, name: "Heart", category: "General" },
  { icon: Icon.Bookmark, name: "Bookmark", category: "General" },
  { icon: Icon.Tag, name: "Tag", category: "General" },
  { icon: Icon.Bolt, name: "Bolt", category: "General" },
  { icon: Icon.Crown, name: "Crown", category: "General" },
  { icon: Icon.Trophy, name: "Trophy", category: "General" },

  // Development
  { icon: Icon.Code, name: "Code", category: "Development" },
  { icon: Icon.Terminal, name: "Terminal", category: "Development" },
  { icon: Icon.Bug, name: "Bug", category: "Development" },
  { icon: Icon.Hammer, name: "Hammer", category: "Development" },
  { icon: Icon.Gear, name: "Gear", category: "Development" },
  { icon: Icon.WrenchScrewdriver, name: "Tools", category: "Development" },
  { icon: Icon.CommandSymbol, name: "Command", category: "Development" },
  { icon: Icon.Rocket, name: "Rocket", category: "Development" },

  // Work
  { icon: Icon.Building, name: "Building", category: "Work" },
  { icon: Icon.Tray, name: "Briefcase", category: "Work" },
  { icon: Icon.Desktop, name: "Desktop", category: "Work" },
  { icon: Icon.Monitor, name: "Monitor", category: "Work" },
  { icon: Icon.Envelope, name: "Envelope", category: "Work" },
  { icon: Icon.Calendar, name: "Calendar", category: "Work" },
  { icon: Icon.Clock, name: "Clock", category: "Work" },
  { icon: Icon.Phone, name: "Phone", category: "Work" },

  // Creative
  { icon: Icon.Pencil, name: "Pencil", category: "Creative" },
  { icon: Icon.Brush, name: "Brush", category: "Creative" },
  { icon: Icon.Image, name: "Image", category: "Creative" },
  { icon: Icon.Video, name: "Video", category: "Creative" },
  { icon: Icon.Camera, name: "Camera", category: "Creative" },
  { icon: Icon.Microphone, name: "Microphone", category: "Creative" },
  { icon: Icon.Music, name: "Music", category: "Creative" },
  { icon: Icon.Headphones, name: "Headphones", category: "Creative" },

  // Data & Learning
  { icon: Icon.Book, name: "Book", category: "Learning" },
  { icon: Icon.Snippets, name: "Learning", category: "Learning" },
  { icon: Icon.LightBulb, name: "Light Bulb", category: "Learning" },
  { icon: Icon.MagnifyingGlass, name: "Search", category: "Learning" },
  { icon: Icon.BarChart, name: "Bar Chart", category: "Data" },
  { icon: Icon.LineChart, name: "Line Chart", category: "Data" },
  { icon: Icon.PieChart, name: "Pie Chart", category: "Data" },

  // Communication
  { icon: Icon.Bubble, name: "Chat", category: "Communication" },
  { icon: Icon.Person, name: "Person", category: "Communication" },
  { icon: Icon.TwoPeople, name: "Team", category: "Communication" },
  { icon: Icon.Globe, name: "Globe", category: "Communication" },
  { icon: Icon.Network, name: "Network", category: "Communication" },
  { icon: Icon.Link, name: "Link", category: "Communication" },

  // Misc
  { icon: Icon.Box, name: "Box", category: "Misc" },
  { icon: Icon.GameController, name: "Game", category: "Misc" },
  { icon: Icon.Shield, name: "Shield", category: "Misc" },
  { icon: Icon.Key, name: "Key", category: "Misc" },
  { icon: Icon.Leaf, name: "Leaf", category: "Misc" },
  { icon: Icon.Sun, name: "Sun", category: "Misc" },
  { icon: Icon.Moon, name: "Moon", category: "Misc" },
  { icon: Icon.Cloud, name: "Cloud", category: "Misc" },
  { icon: Icon.Airplane, name: "Airplane", category: "Misc" },
  { icon: Icon.Car, name: "Car", category: "Misc" },
  { icon: Icon.Wallet, name: "Wallet", category: "Misc" },
  { icon: Icon.BankNote, name: "Money", category: "Misc" },
];

/**
 * Gets an Icon from an icon name
 */
export function getWorkspaceIcon(iconName?: string): Icon {
  if (!iconName) return Icon.Folder;
  const found = WORKSPACE_ICONS.find((opt) => opt.name === iconName);
  return found?.icon || Icon.Folder;
}
