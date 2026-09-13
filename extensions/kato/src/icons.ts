import { Color, Image } from "@raycast/api";

export type KatoIcon =
  | "calendar"
  | "comment"
  | "comment-add"
  | "copy"
  | "external-link"
  | "folder"
  | "list"
  | "user"
  | "users"
  | "credit-card"
  | "inbox"
  | "globe"
  | "database"
  | "record"
  | "task"
  | "task-add"
  | "video";

export function hugeicon(name: KatoIcon, tintColor?: Color.ColorLike) {
  return {
    source: `hugeicons/${name}.svg`,
    ...(tintColor ? { tintColor } : {}),
  } satisfies Image.ImageLike;
}

const objectIconGlyphs: Record<string, string> = {
  folder:
    '<path d="M2.5 6.5A2.5 2.5 0 0 1 5 4h4.15c.7 0 1.37.3 1.84.82L12.95 7H19a2.5 2.5 0 0 1 2.5 2.5v7A3.5 3.5 0 0 1 18 20H6a3.5 3.5 0 0 1-3.5-3.5v-10Z"/>',
  list: '<rect x="3" y="4" width="4" height="4" rx="1.25"/><rect x="9" y="4.5" width="12" height="3" rx="1.5"/><rect x="3" y="10" width="4" height="4" rx="1.25"/><rect x="9" y="10.5" width="12" height="3" rx="1.5"/><rect x="3" y="16" width="4" height="4" rx="1.25"/><rect x="9" y="16.5" width="12" height="3" rx="1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.25c0-4.28 3.08-6.75 7.5-6.75s7.5 2.47 7.5 6.75c0 .41-.34.75-.75.75H5.25a.75.75 0 0 1-.75-.75Z"/>',
  users:
    '<circle cx="9" cy="8.25" r="3.5"/><path d="M2.5 19.75c0-3.9 2.67-6.25 6.5-6.25s6.5 2.35 6.5 6.25c0 .41-.34.75-.75.75H3.25a.75.75 0 0 1-.75-.75Z"/><circle cx="17.25" cy="9" r="2.75"/><path d="M15.48 14.1c.58-.16 1.2-.24 1.86-.24 2.92 0 5.16 1.86 5.16 5.14 0 .41-.34.75-.75.75h-4.62c-.03-2.34-.62-4.21-1.65-5.65Z"/>',
  creditCard:
    '<path d="M3.5 4.5h17A2.5 2.5 0 0 1 23 7v2H1V7a2.5 2.5 0 0 1 2.5-2.5Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M1 11h22v6a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 1 17v-6Zm3 4.25c0 .41.34.75.75.75H9.5a.75.75 0 0 0 0-1.5H4.75a.75.75 0 0 0-.75.75Z"/>',
  inbox:
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M5.2 3h13.6a2.5 2.5 0 0 1 2.42 1.87l2.2 8.45c.05.2.08.42.08.63v4.55A2.5 2.5 0 0 1 21 21H3a2.5 2.5 0 0 1-2.5-2.5v-4.55c0-.21.03-.42.08-.63l2.2-8.45A2.5 2.5 0 0 1 5.2 3Zm-2.44 11 1.87-7.2A.6.6 0 0 1 5.2 6h13.6c.27 0 .5.18.57.44L21.24 14H16.5a1.5 1.5 0 0 0-1.34.83l-.34.67a1.5 1.5 0 0 1-1.34.83h-2.96a1.5 1.5 0 0 1-1.34-.83l-.34-.67A1.5 1.5 0 0 0 7.5 14H2.76Z"/>',
  globe:
    '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.15a7.85 7.85 0 1 1 0 15.7 7.85 7.85 0 0 1 0-15.7Z"/><path d="M11.05 3.2h1.9v17.6h-1.9z"/><path d="M3.2 11.05h17.6v1.9H3.2z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.65c3.18 0 5.35 4.17 5.35 9.35S15.18 21.35 12 21.35 6.65 17.18 6.65 12 8.82 2.65 12 2.65Zm0 2c-1.55 0-3.35 2.98-3.35 7.35s1.8 7.35 3.35 7.35 3.35-2.98 3.35-7.35S13.55 4.65 12 4.65Z"/>',
  database:
    '<ellipse cx="12" cy="5.25" rx="8.5" ry="3.75"/><path d="M3.5 8.65C5.48 10.11 8.52 11 12 11s6.52-.89 8.5-2.35v3.1c0 2.07-3.81 3.75-8.5 3.75s-8.5-1.68-8.5-3.75v-3.1Z"/><path d="M3.5 15.15c1.98 1.46 5.02 2.35 8.5 2.35s6.52-.89 8.5-2.35v3.1C20.5 20.32 16.69 22 12 22s-8.5-1.68-8.5-3.75v-3.1Z"/>',
};

function objectTileSvg(icon: string, color: string) {
  const glyph = objectIconGlyphs[icon];
  if (!glyph) return undefined;
  const background = /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#71717a";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="0.85" y="0.85" width="22.3" height="22.3" rx="7.2" fill="${background}" stroke="#fff" stroke-opacity="0.1" stroke-width="1.7"/><g transform="translate(3.4286 3.4286) scale(0.714286)" fill="#fff">${glyph}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function recordIcon(icon?: string | null, color?: string | null) {
  const tile = icon ? objectTileSvg(icon, color ?? "#71717a") : undefined;
  return tile ?? hugeicon("record", color ?? Color.Orange);
}

function recordInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function escapeXml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}

function recordInitialsSvg(name: string, color: string) {
  const initials = escapeXml(recordInitials(name) || "K");
  const safeColor = /^#[\da-f]{3,8}$/i.test(color) ? color : "#71717a";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${safeColor}" fill-opacity="0.125"/><text x="12" y="12" fill="${safeColor}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function recordAvatar(
  name: string,
  avatarUrl?: string | null,
  color?: string | null,
) {
  const fallback = recordInitialsSvg(name, color ?? "#71717a");
  return {
    source: avatarUrl || fallback,
    fallback,
    mask: Image.Mask.Circle,
  } satisfies Image.ImageLike;
}

export function profileAvatar(
  name?: string | null,
  email?: string | null,
  avatarUrl?: string | null,
) {
  const label = name?.trim() || email?.trim() || "Kato";
  const fallback = recordInitialsSvg(label, "#d4d4d8");
  return {
    source: avatarUrl || fallback,
    fallback,
    mask: Image.Mask.Circle,
  } satisfies Image.ImageLike;
}

const taskPriorityIcons = {
  no_priority: {
    source: "task-priority/more-horizontal.svg",
    tintColor: "#71717a",
  },
  low: { source: "task-priority/low-signal.svg", tintColor: "#14b8a6" },
  medium: {
    source: "task-priority/medium-signal.svg",
    tintColor: "#eab308",
  },
  high: { source: "task-priority/full-signal.svg", tintColor: "#f97316" },
  urgent: { source: "task-priority/alert.svg", tintColor: "#ef4444" },
} as const satisfies Record<string, Image.ImageLike>;

export function taskPriorityIcon(priority: string): Image.ImageLike {
  return (
    taskPriorityIcons[priority as keyof typeof taskPriorityIcons] ??
    taskPriorityIcons.no_priority
  );
}

const taskStatusIconAssets: Record<string, string> = {
  circle: "task-status/circle.svg",
  progress: "task-status/progress.svg",
  loading: "task-status/loading.svg",
  checkCircle: "task-status/check-circle.svg",
};

const defaultTaskStatusIcons: Record<string, string> = {
  todo: "circle",
  in_progress: "progress",
  under_review: "loading",
  done: "checkCircle",
  backlog: "circle",
};

export function taskStatusIcon(status: {
  slug: string;
  color: string;
  icon?: string | null;
}): Image.ImageLike {
  const iconName =
    (status.icon && taskStatusIconAssets[status.icon]
      ? status.icon
      : defaultTaskStatusIcons[status.slug]) ?? "circle";
  return {
    source: taskStatusIconAssets[iconName] ?? taskStatusIconAssets.circle,
    tintColor: status.color || "#71717a",
  };
}
