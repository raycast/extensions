import { Icon } from "@raycast/api";

type IconOption = { title: string; value: Icon };
type IconGroup = { title: string; icons: IconOption[] };

const RAW_ICON_GROUPS: IconGroup[] = [
  {
    title: "General",
    icons: [
      { title: "Layers", value: Icon.Layers },
      { title: "Star", value: Icon.Star },
      { title: "Bolt", value: Icon.Bolt },
      { title: "Rocket", value: Icon.Rocket },
      { title: "Flag", value: Icon.Flag },
      { title: "Pin", value: Icon.Pin },
      { title: "Tag", value: Icon.Tag },
      { title: "Bookmark", value: Icon.Bookmark },
      { title: "Heart", value: Icon.Heart },
      { title: "Shield", value: Icon.Shield },
      { title: "Key", value: Icon.Key },
      { title: "Link", value: Icon.Link },
      { title: "Quicklink", value: Icon.Quicklink },
      { title: "Command", value: Icon.CommandSymbol },
    ],
  },
  {
    title: "Writing",
    icons: [
      { title: "Text", value: Icon.Text },
      { title: "Paragraph", value: Icon.Paragraph },
      { title: "Short Paragraph", value: Icon.ShortParagraph },
      { title: "Heading", value: Icon.Heading },
      { title: "Quote", value: Icon.QuotationMarks },
      { title: "Quote Block", value: Icon.QuoteBlock },
      { title: "Bullet Points", value: Icon.BulletPoints },
      { title: "Checklist", value: Icon.CheckList },
      { title: "Highlight", value: Icon.Highlight },
      { title: "Pencil", value: Icon.Pencil },
      { title: "Bold", value: Icon.Bold },
      { title: "Italics", value: Icon.Italics },
      { title: "Underline", value: Icon.Underline },
      { title: "Eraser", value: Icon.Eraser },
    ],
  },
  {
    title: "Apps & Windows",
    icons: [
      { title: "App Window", value: Icon.AppWindow },
      { title: "App Grid 2×2", value: Icon.AppWindowGrid2x2 },
      { title: "App Grid 3×3", value: Icon.AppWindowGrid3x3 },
      { title: "App List", value: Icon.AppWindowList },
      { title: "Sidebar", value: Icon.AppWindowSidebarLeft },
      { title: "Monitor", value: Icon.Monitor },
      { title: "Desktop", value: Icon.Desktop },
      { title: "Mobile", value: Icon.Mobile },
      { title: "Terminal", value: Icon.Terminal },
      { title: "Cog", value: Icon.Cog },
    ],
  },
  {
    title: "Web & Communication",
    icons: [
      { title: "Globe", value: Icon.Globe },
      { title: "Compass", value: Icon.Compass },
      { title: "Magnifying Glass", value: Icon.MagnifyingGlass },
      { title: "Filter", value: Icon.Filter },
      { title: "Network", value: Icon.Network },
      { title: "Wi-Fi", value: Icon.Wifi },
      { title: "Speech Bubble", value: Icon.SpeechBubble },
      { title: "Envelope", value: Icon.Envelope },
      { title: "Phone", value: Icon.Phone },
      { title: "Megaphone", value: Icon.Megaphone },
      { title: "Microphone", value: Icon.Microphone },
      { title: "Video", value: Icon.Video },
      { title: "Camera", value: Icon.Camera },
      { title: "Image", value: Icon.Image },
    ],
  },
  {
    title: "Files & Documents",
    icons: [
      { title: "Document", value: Icon.Document },
      { title: "Folder", value: Icon.Folder },
      { title: "New Folder", value: Icon.NewFolder },
      { title: "New Document", value: Icon.NewDocument },
      { title: "Book", value: Icon.Book },
      { title: "Clipboard", value: Icon.Clipboard },
      { title: "Box", value: Icon.Box },
      { title: "Hard Drive", value: Icon.HardDrive },
      { title: "Tray", value: Icon.Tray },
      { title: "Save", value: Icon.SaveDocument },
      { title: "Download", value: Icon.Download },
      { title: "Upload", value: Icon.Upload },
    ],
  },
  {
    title: "Media",
    icons: [
      { title: "Music", value: Icon.Music },
      { title: "Headphones", value: Icon.Headphones },
      { title: "Speaker", value: Icon.Speaker },
      { title: "Play", value: Icon.Play },
      { title: "Pause", value: Icon.Pause },
      { title: "Game Controller", value: Icon.GameController },
      { title: "Film Strip", value: Icon.FilmStrip },
      { title: "RSS", value: Icon.Rss },
      { title: "Waveform", value: Icon.Waveform },
    ],
  },
  {
    title: "Developer & Data",
    icons: [
      { title: "Code", value: Icon.Code },
      { title: "Code Block", value: Icon.CodeBlock },
      { title: "Bug", value: Icon.Bug },
      { title: "Hammer", value: Icon.Hammer },
      { title: "Tool", value: Icon.WrenchScrewdriver },
      { title: "Ruler", value: Icon.Ruler },
      { title: "Chip", value: Icon.ComputerChip },
      { title: "Bar Chart", value: Icon.BarChart },
      { title: "Line Chart", value: Icon.LineChart },
      { title: "Pie Chart", value: Icon.PieChart },
      { title: "Gauge", value: Icon.Gauge },
    ],
  },
  {
    title: "Places & Travel",
    icons: [
      { title: "House", value: Icon.House },
      { title: "Building", value: Icon.Building },
      { title: "Map", value: Icon.Map },
      { title: "Location", value: Icon.Geopin },
      { title: "Tree", value: Icon.Tree },
      { title: "Leaf", value: Icon.Leaf },
      { title: "Mountain", value: Icon.Mountain },
      { title: "Car", value: Icon.Car },
      { title: "Train", value: Icon.Train },
      { title: "Airplane", value: Icon.Airplane },
      { title: "Bike", value: Icon.Bike },
      { title: "Boat", value: Icon.Boat },
    ],
  },
  {
    title: "Time & Sky",
    icons: [
      { title: "Calendar", value: Icon.Calendar },
      { title: "Clock", value: Icon.Clock },
      { title: "Stopwatch", value: Icon.Stopwatch },
      { title: "Alarm", value: Icon.Alarm },
      { title: "Bell", value: Icon.Bell },
      { title: "Hourglass", value: Icon.Hourglass },
      { title: "Moon", value: Icon.Moon },
      { title: "Sun", value: Icon.Sun },
      { title: "Snowflake", value: Icon.Snowflake },
      { title: "Droplets", value: Icon.Droplets },
    ],
  },
  {
    title: "People & Shopping",
    icons: [
      { title: "Person", value: Icon.Person },
      { title: "People", value: Icon.TwoPeople },
      { title: "Avatar", value: Icon.PersonCircle },
      { title: "Cart", value: Icon.Cart },
      { title: "Store", value: Icon.Store },
      { title: "Ticket", value: Icon.Ticket },
      { title: "Wallet", value: Icon.Wallet },
      { title: "Bank Note", value: Icon.BankNote },
      { title: "Credit Card", value: Icon.CreditCard },
      { title: "Receipt", value: Icon.Receipt },
      { title: "Gift", value: Icon.Gift },
      { title: "Trophy", value: Icon.Trophy },
      { title: "Calculator", value: Icon.Calculator },
      { title: "Mug", value: Icon.Mug },
      { title: "Steaming Mug", value: Icon.MugSteam },
    ],
  },
];

// Several Icon members share the same underlying glyph (e.g. Window == AppWindow,
// Gear == Cog). Keep the first occurrence so React keys stay unique.
function dedupeByValue(groups: IconGroup[]): IconGroup[] {
  const seen = new Set<string>();
  return groups
    .map((group) => ({
      title: group.title,
      icons: group.icons.filter((icon) => {
        if (seen.has(icon.value)) return false;
        seen.add(icon.value);
        return true;
      }),
    }))
    .filter((group) => group.icons.length > 0);
}

export const ICON_GROUPS = dedupeByValue(RAW_ICON_GROUPS);

/** Every glyph value in the table, for checking a stored icon against it. */
export const ICON_VALUES = new Set<string>(ICON_GROUPS.flatMap((group) => group.icons.map((icon) => icon.value)));
