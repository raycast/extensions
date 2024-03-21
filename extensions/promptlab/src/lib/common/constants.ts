import { Color, Icon } from "@raycast/api";
import { CommandCategory } from "../commands/types";

/**
 * The base URL for the PromptLab Store API.
 */
export const STORE_ENDPOINT = "https://v1.slashapi.com/promptlab/google-sheets/JkZQUmHrPK/sheet1";

/**
 * The API key for the PromptLab Store API.
 * This key only permits reading and writing commands, not deleting or otherwise modifying them.
 */
export const STORE_KEY = "JYfba9q8piZhhF88BymU9qQd6qjbZi5iAeUA5YI1";

/**
 * The base URL for the PromptLab QuickLinks.
 */
export const QUICKLINK_URL_BASE =
  "raycast://extensions/HelloImSteven/promptlab/search-commands?arguments=%7B%22commandName%22:%22";

/**
 * The filename for the placeholders guide in the support directory.
 */
export const PLACEHOLDERS_GUIDE_FILENAME = "placeholders_guide.md";

/**
 * The filename for the custom placeholders file in the support directory.
 */
export const CUSTOM_PLACEHOLDERS_FILENAME = "custom_placeholders.json";

/**
 * The filename for the advanced settings file in the support directory.
 */
export const ADVANCED_SETTINGS_FILENAME = "advanced_settings.json";

export const STORAGE_KEYS = {
  /**
   * Key for the list of persistent variables as JSON objects containing the variable's name,  value, and initial (default) value.
   */
  PERSISTENT_VARIABLES: "--persistent-variables",

  /**
   * Key for the list of UUIDs used in placeholders thus far.
   */
  USED_UUIDS: "--uuids",
};

/**
 * Command categories and their icons/icon colors.
 */
export const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    name: "Other",
    icon: Icon.Circle,
    color: Color.SecondaryText,
  },
  {
    name: "Calendar",
    icon: Icon.Calendar,
    color: Color.Red,
  },
  {
    name: "Data",
    icon: Icon.List,
    color: Color.Blue,
  },
  {
    name: "Development",
    icon: Icon.Terminal,
    color: Color.PrimaryText,
  },
  {
    name: "Education",
    icon: Icon.Bookmark,
    color: Color.Orange,
  },
  {
    name: "Entertainment",
    icon: Icon.Video,
    color: Color.Red,
  },
  {
    name: "Files",
    icon: Icon.Folder,
    color: Color.Blue,
  },
  {
    name: "Finance",
    icon: Icon.Coin,
    color: Color.Green,
  },
  {
    name: "Health",
    icon: Icon.Heartbeat,
    color: Color.Red,
  },
  {
    name: "Lifestyle",
    icon: Icon.Person,
    color: Color.Green,
  },
  {
    name: "Media",
    icon: Icon.Image,
    color: Color.Magenta,
  },
  {
    name: "Meta",
    icon: Icon.Info,
    color: Color.SecondaryText,
  },
  {
    name: "News",
    icon: Icon.Important,
    color: Color.Blue,
  },
  {
    name: "Productivity",
    icon: Icon.Checkmark,
    color: Color.Green,
  },
  {
    name: "Reference",
    icon: Icon.Book,
    color: Color.Red,
  },
  {
    name: "Shopping",
    icon: Icon.Cart,
    color: Color.Purple,
  },
  {
    name: "Social",
    icon: Icon.TwoPeople,
    color: Color.Green,
  },
  {
    name: "Sports",
    icon: Icon.SoccerBall,
    color: Color.PrimaryText,
  },
  {
    name: "Travel",
    icon: Icon.Airplane,
    color: Color.Yellow,
  },
  {
    name: "Utilities",
    icon: Icon.Calculator,
    color: Color.Blue,
  },
  {
    name: "Weather",
    icon: Icon.CloudSun,
    color: Color.Blue,
  },
  {
    name: "Web",
    icon: Icon.Network,
    color: Color.Red,
  },
  {
    name: "Writing",
    icon: Icon.Pencil,
    color: Color.Yellow,
  },
];
