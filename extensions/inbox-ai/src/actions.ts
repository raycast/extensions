import { Icon } from "@raycast/api";
import { homedir } from "os";
import * as plist from "plist";
import { execSync } from "child_process";

export interface ActionVariable {
  id: string;
  name: string;
  required: boolean;
  label: string;
  description: string;
  value: string;
  ai: boolean;
  type: string;
}

export interface SavedAction {
  id: string;
  displayName: string;
  description: string;
  identifier: string;
  type: string;
  icon: string;
  variables: ActionVariable[];
  instructions: string;
}

export interface PlistData {
  savedActions: SavedAction[];
}

interface ParsedPlistData {
  savedActions: Buffer | SavedAction[];
  [key: string]: unknown;
}

export function readPlistFile(): PlistData | null {
  try {
    const plistPath = `${homedir()}/Library/Group Containers/6DA7MK99T2.com.dreetje.InboxAI.group/Library/Preferences/6DA7MK99T2.com.dreetje.InboxAI.group.plist`;

    // Convert binary plist to XML format using plutil
    const xmlContent = execSync(`plutil -convert xml1 -o - "${plistPath}"`).toString();
    const parsedData = plist.parse(xmlContent) as ParsedPlistData;

    // Parse the savedActions buffer if it exists
    if (parsedData && parsedData.savedActions && Buffer.isBuffer(parsedData.savedActions)) {
      try {
        parsedData.savedActions = JSON.parse(parsedData.savedActions.toString());
      } catch (e) {
        console.error("Failed to parse savedActions:", e);
        return null;
      }
    }

    if (!parsedData || !Array.isArray(parsedData.savedActions)) {
      console.error("Invalid plist data structure:", parsedData);
      return null;
    }

    return parsedData as PlistData;
  } catch (error) {
    console.error("Error reading plist file:", error);
    return null;
  }
}

export const getIconForName = (name: string): Icon => {
  // Exact matches take precedence
  const exactMatches: { [key: string]: Icon } = {
    "doc.on.clipboard": Icon.Clipboard,
    "bubble.left.and.text.bubble.right": Icon.Message,
    "macwindow.and.cursorarrow": Icon.Window,
    "text.badge.checkmark": Icon.CheckCircle,
    "list.bullet": Icon.List,
    "arrow.uturn.left": Icon.ArrowLeftCircle,
    "text.bubble": Icon.Message,
    "questionmark.bubble": Icon.QuestionMark,
    "doc.text.magnifyingglass": Icon.MagnifyingGlass,
    "message.badge.waveform": Icon.Microphone,
    "note.text.badge.plus": Icon.Plus,
    "checklist.unchecked": Icon.Checkmark,
    "list.bullet.indent": Icon.List,
    "square.and.pencil": Icon.Pencil,
    "envelope.arrow.triangle.branch": Icon.Envelope,
    "arrow.trianglehead.branch": Icon.ArrowRight,
  };

  // First-word fallbacks
  const firstWordMatches: { [key: string]: Icon } = {
    waveform: Icon.Microphone,
    doc: Icon.Document,
    bubble: Icon.Message,
    envelope: Icon.Envelope,
    folder: Icon.Folder,
    macwindow: Icon.Window,
    applescript: Icon.Terminal,
    text: Icon.Text,
    mail: Icon.Envelope,
    bell: Icon.Bell,
    clipboard: Icon.Clipboard,
    list: Icon.List,
    camera: Icon.Camera,
    arrow: Icon.ArrowRight,
    brain: Icon.Stars,
    questionmark: Icon.QuestionMark,
    message: Icon.Message,
    note: Icon.Document,
    checklist: Icon.Checkmark,
    network: Icon.Globe,
    calendar: Icon.Calendar,
    link: Icon.Link,
    square: Icon.Pencil,
  };

  // Try exact match first
  if (exactMatches[name]) {
    return exactMatches[name];
  }

  // Fall back to first word matching
  const firstWord = name.split(".")[0];
  return firstWordMatches[firstWord] || Icon.Circle;
};

export function filterActions(
  actions: SavedAction[] | undefined,
  searchText: string,
  supportedTypes: string[],
): SavedAction[] {
  return (
    actions
      ?.filter(
        (action) =>
          supportedTypes.includes(action.type) &&
          (action.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
            action.description.toLowerCase().includes(searchText.toLowerCase())),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName)) || []
  );
}
