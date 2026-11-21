import { Color, Icon, Image } from "@raycast/api";
import { Board, User } from "./issue";

// Jira's own colours for its standard issue types. Other types get a neutral icon.
const TYPE_ICONS: Record<string, Image.ImageLike> = {
  bug: { source: Icon.Bug, tintColor: Color.Red },
  story: { source: Icon.Bookmark, tintColor: Color.Green },
  task: { source: Icon.CheckCircle, tintColor: Color.Blue },
  subtask: { source: Icon.CheckCircle, tintColor: Color.Blue },
  "sub-task": { source: Icon.CheckCircle, tintColor: Color.Blue },
  epic: { source: Icon.Bolt, tintColor: Color.Purple },
};

export function typeIcon(type: string): Image.ImageLike {
  return TYPE_ICONS[type.toLowerCase()] ?? { source: Icon.Document, tintColor: Color.SecondaryText };
}

// Top and bottom of each avatar's gradient, dark enough for white initials.
const AVATAR_COLORS: [string, string][] = [
  ["#5e8bff", "#3a5fd9"],
  ["#4fc38a", "#2a9463"],
  ["#f2994a", "#d4692a"],
  ["#e5556b", "#c03550"],
  ["#a77bf3", "#7c4fd6"],
  ["#3fb8c9", "#1f8fa3"],
  ["#e4b13c", "#c08a1c"],
  ["#d16fb8", "#a94b92"],
];

// Cap height of the system font, as a share of its size, to put the initials' middle on the circle's.
const CAP_HEIGHT = 0.71;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = [...(words[0] ?? "")][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Initials on a colour picked from the name, so each person looks the same everywhere.
 * Drawn here rather than with getAvatarIcon, whose initials sit off-centre in Raycast's font.
 */
export function userIcon(user?: User): Image.ImageLike {
  if (!user) return { source: Icon.PersonCircle, tintColor: Color.SecondaryText };
  const text = initials(user.displayName);
  let hash = 0;
  for (const char of user.displayName) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const [top, bottom] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  const size = text.length > 1 ? 40 : 48;
  const baseline = 50 + (size * CAP_HEIGHT) / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<circle cx="50" cy="50" r="50" fill="url(#g)"/>` +
    `<text x="50" y="${baseline.toFixed(1)}" text-anchor="middle" font-size="${size}" font-weight="600" ` +
    `font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif" fill="#fff">` +
    `${text.replace(/[<&>"]/g, "")}</text></svg>`;
  return { source: `data:image/svg+xml,${encodeURIComponent(svg)}`, mask: Image.Mask.Circle };
}

const BOARD_TYPES: Record<Board["type"], { label: string; icon: Icon }> = {
  scrum: { label: "Scrum", icon: Icon.ArrowClockwise },
  kanban: { label: "Kanban", icon: Icon.AppWindowGrid3x3 },
  simple: { label: "Team-managed", icon: Icon.AppWindowList },
};

export function boardIcon(board: Board): Image.ImageLike {
  return { source: BOARD_TYPES[board.type].icon, tintColor: Color.SecondaryText };
}

/** "ACME · Scrum". */
export function boardSubtitle(board: Board): string {
  return [board.spaceKey, BOARD_TYPES[board.type].label].filter(Boolean).join(" · ");
}
