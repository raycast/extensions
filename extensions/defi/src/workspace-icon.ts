import { Color, Icon, type Image, type List } from "@raycast/api";

// Raycast icons for the SF Symbols most often set in [workspaces] icons.
const symbols: Record<string, Icon> = {
  curlybraces: Icon.Code,
  "chevron.left.forwardslash.chevron.right": Icon.Code,
  terminal: Icon.Terminal,
  hammer: Icon.Hammer,
  "wrench.and.screwdriver": Icon.WrenchScrewdriver,
  ladybug: Icon.Bug,
  ant: Icon.Bug,
  globe: Icon.Globe,
  safari: Icon.Globe,
  message: Icon.Message,
  bubble: Icon.Bubble,
  envelope: Icon.Envelope,
  calendar: Icon.Calendar,
  music: Icon.Music,
  headphones: Icon.Headphones,
  video: Icon.Video,
  photo: Icon.Image,
  camera: Icon.Camera,
  paintbrush: Icon.Brush,
  pencil: Icon.Pencil,
  doc: Icon.Document,
  book: Icon.Book,
  folder: Icon.Folder,
  tray: Icon.Tray,
  gearshape: Icon.Gear,
  gear: Icon.Gear,
  cloud: Icon.Cloud,
  star: Icon.Star,
  heart: Icon.Heart,
  house: Icon.House,
  person: Icon.Person,
  lock: Icon.Lock,
  gamecontroller: Icon.GameController,
  cart: Icon.Cart,
  leaf: Icon.Leaf,
  bolt: Icon.Bolt,
  airplane: Icon.Airplane,
  desktopcomputer: Icon.Desktop,
  display: Icon.Monitor,
};

type Workspace = { position: number; icon?: string; kind?: string };

// The workspace's configured symbol, or its position as a number; tinted when active.
export function workspaceIcon(workspace: Workspace, active = false): Image.ImageLike {
  if (workspace.kind === "trailing") return Icon.Plus;
  const symbol = workspace.icon?.replace(/\.(fill|circle|square)$/g, "");
  const number = Icon[`Number${String(workspace.position).padStart(2, "0")}` as keyof typeof Icon];
  const source = (symbol && (symbols[symbol] ?? symbols[symbol.split(".")[0]])) || number || Icon.AppWindowGrid3x3;
  return active ? { source, tintColor: Color.Blue } : source;
}

const maxAppIcons = 5;

// A workspace row's accessories: up to five app icons, a count of the rest, and the Active tag.
export function workspaceAccessories(
  workspace: { applications: string[]; active: boolean },
  appIcon: (bundleID?: string) => Image.ImageLike | undefined,
  appName: (bundleID: string) => string,
): List.Item.Accessory[] {
  const icons = workspace.applications.map((app) => ({ icon: appIcon(app) ?? Icon.AppWindow, tooltip: appName(app) }));
  const extra = icons.length - maxAppIcons;
  return [
    ...icons.slice(0, maxAppIcons),
    ...(extra > 0 ? [{ text: `+${extra}` }] : []),
    ...(workspace.active ? [{ tag: { value: "Active", color: Color.Blue } }] : []),
  ];
}
