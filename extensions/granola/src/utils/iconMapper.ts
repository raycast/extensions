import { Icon, Color } from "@raycast/api";

// Cache for icon mappings to avoid recalculating for the same input
const iconMappingCache = new Map<string, Icon>();
const colorMappingCache = new Map<string, Color>();

/**
 * Maps Granola icon names to Raycast icons with caching for better performance
 * @param iconName The icon name from Granola API
 * @returns The corresponding Raycast Icon
 */
export function mapIconToRaycast(iconName: string): Icon {
  // Normalize iconName to lowercase for consistent matching
  const normalizedIconName = iconName?.toLowerCase() || "";

  // Check cache first
  if (iconMappingCache.has(normalizedIconName)) {
    return iconMappingCache.get(normalizedIconName)!;
  }

  // Map the icon name
  let result: Icon;
  switch (normalizedIconName) {
    // People
    case "usericon":
      result = Icon.Person;
      break;
    case "facesmileicon":
    case "emojihappyicon":
      result = Icon.Emoji;
      break;
    case "usergroupicon":
      result = Icon.PersonCircle;
      break;

    // Common UI
    case "staricon":
      result = Icon.Star;
      break;
    case "hearticon":
      result = Icon.Heart;
      break;
    case "bookmarkicon":
      result = Icon.Bookmark;
      break;
    case "hashtagicon":
      result = Icon.Text;
      break;
    case "bellicon":
      result = Icon.Bell;
      break;
    case "fireicon":
      result = Icon.ExclamationMark;
      break;
    case "tagicon":
      result = Icon.Tag;
      break;

    // Documents & Files
    case "documenttexticon":
    case "documenticon":
      result = Icon.Document;
      break;
    case "foldericon":
      result = Icon.Folder;
      break;
    case "archiveboxicon":
      result = Icon.Box;
      break;
    case "trashicon":
      result = Icon.Trash;
      break;
    case "pencilicon":
      result = Icon.Pencil;
      break;
    case "linkicon":
      result = Icon.Link;
      break;

    // Communication
    case "envelopeicon":
      result = Icon.Envelope;
      break;
    case "chatbubblelefticon":
    case "chaticon":
      result = Icon.Message;
      break;
    case "phoneicon":
      result = Icon.Phone;
      break;
    case "microphoneicon":
      result = Icon.Microphone;
      break;
    case "videocameraicon":
      result = Icon.Video;
      break;
    case "speakerwaveicon":
      result = Icon.Speaker;
      break;

    // Navigation & Location
    case "homeicon":
      result = Icon.House;
      break;
    case "globeicon":
    case "globealticon":
      result = Icon.Globe;
      break;
    case "mappinicon":
      result = Icon.Pin;
      break;
    case "compassicon":
      result = Icon.Map;
      break;

    // Time & Calendar
    case "calendaricon":
      result = Icon.Calendar;
      break;
    case "clockicon":
      result = Icon.Clock;
      break;

    // Business & Commerce
    case "buildingofficeicon":
    case "buildingicon":
      result = Icon.Building;
      break;
    case "currencydollaricon":
      result = Icon.BankNote;
      break;
    case "briefcaseicon":
      result = Icon.Box;
      break;
    case "chartbaricon":
      result = Icon.BarChart;
      break;
    case "presentationchartlineicon":
      result = Icon.LineChart;
      break;

    // Development
    case "codebracketicon":
      result = Icon.Code;
      break;
    case "commandlineicon":
      result = Icon.Terminal;
      break;
    case "cpuchipicon":
      result = Icon.Circle;
      break;
    case "keyicon":
      result = Icon.Key;
      break;
    case "lockclosedicon":
      result = Icon.Lock;
      break;

    // Misc
    case "puzzlepieceicon":
      result = Icon.List;
      break;
    case "gifticon":
      result = Icon.Gift;
      break;
    case "musicalnoteicon":
      result = Icon.Music;
      break;
    case "trophyicon":
      result = Icon.Trophy;
      break;
    case "lightbulbicon":
      result = Icon.LightBulb;
      break;
    case "wrenchicon":
      result = Icon.Hammer;
      break;
    case "beakericon":
      result = Icon.Circle;
      break;
    case "rocketlaunchicon":
      result = Icon.Rocket;
      break;

    default:
      result = Icon.Folder;
  }

  // Cache the result
  iconMappingCache.set(normalizedIconName, result);
  return result;
}

/**
 * Maps Granola color names to Raycast colors with caching for better performance
 * @param colorName The color name from Granola API
 * @returns The corresponding Raycast Color
 */
export function mapColorToRaycast(colorName: string): Color {
  // Normalize colorName to lowercase for consistent matching
  const normalizedColorName = colorName?.toLowerCase() || "";

  // Check cache first
  if (colorMappingCache.has(normalizedColorName)) {
    return colorMappingCache.get(normalizedColorName)!;
  }

  // Map the color name
  let result: Color;
  switch (normalizedColorName) {
    // Yellows & Oranges
    // "amber" falls through to "orange" for same color mapping
    case "amber":
    case "orange":
      result = Color.Orange;
      break;
    case "yellow":
      result = Color.Yellow;
      break;

    // Blues
    case "blue":
      result = Color.Blue;
      break;
    case "sky":
    case "lightBlue":
      result = Color.Blue;
      break;
    case "indigo":
    case "darkBlue":
      result = Color.Purple;
      break;

    // Reds & Pinks
    case "red":
      result = Color.Red;
      break;
    case "pink":
    case "rose":
      result = Color.Magenta;
      break;

    // Greens
    case "green":
      result = Color.Green;
      break;
    case "emerald":
    case "teal":
      result = Color.Green;
      break;

    // Purples
    case "purple":
    case "violet":
      result = Color.Purple;
      break;

    // Neutrals
    case "black":
      result = Color.PrimaryText;
      break;
    case "gray":
    case "slate":
      result = Color.SecondaryText;
      break;
    case "white":
      result = Color.SecondaryText;
      break;

    default:
      result = Color.Blue;
  }

  // Cache the result
  colorMappingCache.set(normalizedColorName, result);
  return result;
}
