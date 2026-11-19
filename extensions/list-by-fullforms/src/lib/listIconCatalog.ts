// Raycast-side mirror of the web app's app/utils/listIconCatalog.js
// and app/utils/listVisibility.js. The web is the source of truth
// for the icon glyph set + colour palette + visibility chip rules;
// this module re-expresses those tables in Raycast's vocabulary
// (Icon enum values + hex strings the Raycast tintColor accepts)
// so the same list shows the same chip + glyph + tint in both
// surfaces. Keep this file and the two web files in lockstep when
// the catalog or visibility variants change.

import { Color, Icon, Image } from "@raycast/api";

// Mirrors COLOR_PALETTE.fg in the list repo's
// app/utils/listIconCatalog.js. Hex strings rather than Color enum
// values because Raycast's tintColor accepts hex strings cleanly
// and the source palette is keyed in hex — no lossy mapping step.
const LIST_COLOR_HEX: Record<string, string> = {
  blue: "#1d9bf0",
  green: "#10b981",
  red: "#ef4444",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  orange: "#fb923c",
  cyan: "#06b6d4",
  pink: "#ec4899",
  sky: "#0ea5e9",
  slate: "#6b7280",
};

// Mirrors ICON_GLYPHS in app/utils/listIconCatalog.js, mapped to the closest
// match in Raycast's Icon enum, in the same order as the web file: the original
// 20 picker glyphs (list..chart), the 10 the web briefly retired and then
// reinstated (star..target), then the 62 extended Lucide keys.
//
// MUST cover every key the web can store. The web picker offers all 92 and its
// keyword rules auto-assign 55 of them, so a missing key here renders as a
// plain Icon.List — the exact cross-platform gap this mirror exists to close.
// Synced 2026-07-27 against the web's 92-glyph table.
//
// Raycast's set is smaller than Lucide's, so these are closest-fit substitutes
// rather than the same artwork: briefcase→Building, food→MugSteam (no cutlery),
// school→Pencil (no graduation cap), paw→Footprints, palette→Brush,
// sparkle→Stars, bank→Building (no columned landmark; shares with briefcase),
// laptop→Desktop, database→HardDrive, server→Network, share-2→Link,
// flame→Torch, award→Rosette, truck→Lorry (British name for the same thing),
// gem→Crypto (the crypto keyword rule is what assigns this key, so Raycast's
// literal Crypto mark reads better than a gemstone), radio-tower→Waveform
// (radio waves), shirt→Swatch (a fabric swatch is the nearest apparel mark),
// atom→Dna and flask-conical→EyeDropper (Raycast has no physics or lab glass
// icon, so both borrow the nearest science mark), fish→Anchor (there is no fish
// in the enum at all; an anchor is the wrong object but unambiguously marine,
// the same kind of in-domain substitution as paw→Footprints), and four
// deliberate duplicates where Raycast has one icon for two Lucide concepts:
// book-open→Book, flower-2 and sprout→Leaf, handshake→TwoPeople.
//
// USE RAYCAST'S SET ONLY. Do not bundle our own (Lucide) artwork here, even for
// a key with no good match. Tried and reverted 2026-07-27 for `fish`: Lucide is
// drawn at 24px/2px-stroke and one such glyph among 91 native ones reads as a
// mistake next to Raycast's own chrome, the map's type has to widen from
// Record<string, Icon> to Image.ImageLike (so a typo'd asset name silently
// renders nothing instead of failing to compile), and the "only when the native
// option is misleading" bar is a judgment call that ratchets into a hybrid
// nobody designed. Fix a bad match with a better native match; if there is
// genuinely none, leave the key out and let it fall back to Icon.List. Losing
// one glyph's precision is cheaper than losing the set's coherence + type safety.
// Unknown / null glyphs fall back to Icon.List, same as the web's resolver.
const LIST_GLYPH_ICON: Record<string, Icon> = {
  list: Icon.List,
  clipboard: Icon.Clipboard,
  briefcase: Icon.Building,
  medical: Icon.MedicalSupport,
  terminal: Icon.Terminal,
  book: Icon.Book,
  food: Icon.MugSteam,
  leaf: Icon.Leaf,
  music: Icon.Music,
  globe: Icon.Globe,
  groups: Icon.TwoPeople,
  memory: Icon.MemoryChip,
  school: Icon.Pencil,
  paw: Icon.Footprints,
  film: Icon.FilmStrip,
  ball: Icon.SoccerBall,
  palette: Icon.Brush,
  plane: Icon.Airplane,
  bank: Icon.Building,
  chart: Icon.LineChart,
  // Retired from the web picker 2026-07-16/07-17, then reinstated when it
  // gained categories; mapped throughout so stored lists never broke.
  star: Icon.Star,
  heart: Icon.Heart,
  bolt: Icon.Bolt,
  flag: Icon.Flag,
  calendar: Icon.Calendar,
  folder: Icon.Folder,
  cloud: Icon.Cloud,
  sparkle: Icon.Stars,
  tag: Icon.Tag,
  target: Icon.BullsEye,
  // The 62 extended keys the web added 2026-07-16 / 07-27.
  "book-open": Icon.Book,
  "file-text": Icon.TextDocument,
  clock: Icon.Clock,
  bookmark: Icon.Bookmark,
  pin: Icon.Pin,
  package: Icon.Box,
  gift: Icon.Gift,
  key: Icon.Key,
  "building-2": Icon.House,
  wallet: Icon.Wallet,
  "credit-card": Icon.CreditCard,
  banknote: Icon.BankNote,
  "piggy-bank": Icon.Coins,
  "shopping-cart": Icon.Cart,
  "shopping-bag": Icon.Store,
  shirt: Icon.Swatch,
  calculator: Icon.Calculator,
  receipt: Icon.Receipt,
  truck: Icon.Lorry,
  laptop: Icon.Desktop,
  monitor: Icon.Monitor,
  smartphone: Icon.Mobile,
  database: Icon.HardDrive,
  server: Icon.Network,
  code: Icon.Code,
  keyboard: Icon.Keyboard,
  wifi: Icon.Wifi,
  "radio-tower": Icon.Waveform,
  battery: Icon.Battery,
  printer: Icon.Print,
  camera: Icon.Camera,
  "gamepad-2": Icon.GameController,
  atom: Icon.Dna,
  "flask-conical": Icon.EyeDropper,
  user: Icon.Person,
  mail: Icon.Envelope,
  "message-circle": Icon.SpeechBubble,
  phone: Icon.Phone,
  bell: Icon.Bell,
  megaphone: Icon.Megaphone,
  "share-2": Icon.Link,
  smile: Icon.Emoji,
  handshake: Icon.TwoPeople,
  "tree-pine": Icon.Tree,
  "flower-2": Icon.Leaf,
  sprout: Icon.Leaf,
  sun: Icon.Sun,
  moon: Icon.Moon,
  droplet: Icon.Droplets,
  flame: Icon.Torch,
  mountain: Icon.Mountain,
  snowflake: Icon.Snowflake,
  bug: Icon.Bug,
  fish: Icon.Anchor,
  car: Icon.Car,
  "train-front": Icon.Train,
  ship: Icon.Boat,
  award: Icon.Rosette,
  trophy: Icon.Trophy,
  crown: Icon.Crown,
  gem: Icon.Crypto,
  shield: Icon.Shield,
};

// Keyword-based fallback when a list has no explicit icon/color set.
// Mirrors KEYWORD_RULES in app/utils/listIconCatalog.js term-for-term, so a
// list like "Project Management" or "Fish" resolves to the same themed icon +
// color in Raycast as on the web. `words` are stems matched at a word START
// with any suffix (`\bstem\w*`), so `animal` catches "Animals" and `comput`
// catches "Computing". `exact` are short words that must stand ALONE
// (`\bword\b`), because as stems they fire inside unrelated words: `lab` in
// "Labels", `cat` in "Catalog", `train` in "Training", `tax` in "Taxonomy".
// Matching is specificity-scored, NOT first-match-wins — see matchKeywordRule.
type KeywordRule = {
  icon: string;
  color: string;
  words: string[];
  exact?: string[];
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    icon: "clipboard",
    color: "blue",
    words: [
      "project",
      "task",
      "plan",
      "management",
      "kanban",
      "sprint",
      "roadmap",
      "backlog",
      "milestone",
    ],
  },
  {
    icon: "briefcase",
    color: "green",
    words: [
      "business",
      "work",
      "office",
      "company",
      "corporate",
      "sales",
      "startup",
      "entrepreneur",
      "mckinsey",
    ],
  },
  {
    icon: "medical",
    color: "red",
    words: [
      "medical",
      "health",
      "doctor",
      "hospital",
      "clinic",
      "blood",
      "disease",
      "surgery",
      "dental",
      "therap",
      "pharma",
      "anatomy",
      "symptom",
      "diagnos",
      "fitness",
      "laborator",
      "radiolog",
      "cardiolog",
      "neurolog",
      "oncolog",
      "immunolog",
      "epidemiolog",
      "vaccin",
    ],
    exact: ["lab", "labs", "test", "tests"],
  },
  {
    icon: "terminal",
    color: "purple",
    words: [
      "comput",
      "tech",
      "code",
      "develop",
      "software",
      "engineer",
      "programming",
    ],
    exact: ["dev", "devs"],
  },
  {
    icon: "book",
    color: "amber",
    words: [
      "book",
      "read",
      "library",
      "reference",
      "literature",
      "dictionary",
      "word",
      "vocab",
    ],
  },
  {
    icon: "food",
    color: "orange",
    words: [
      "food",
      "seafood",
      "recipe",
      "cook",
      "cuisine",
      "kitchen",
      "meal",
      "drink",
      "baking",
      "beverage",
      "nutrition",
      "coffee",
      "wine",
      "brewing",
      "cocktail",
      "confectioner",
    ],
    exact: ["tea"],
  },
  {
    icon: "leaf",
    color: "cyan",
    words: [
      "plant",
      "flower",
      "garden",
      "botan",
      "herb",
      "agricultur",
      "farming",
      "nature",
    ],
  },
  {
    icon: "music",
    color: "pink",
    words: ["music", "song", "sound", "audio", "album"],
    exact: ["band", "bands"],
  },
  {
    icon: "globe",
    color: "sky",
    words: ["travel", "country", "geography", "tourism", "international"],
    exact: ["map", "maps", "trip", "trips", "city"],
  },
  { icon: "fish", color: "sky", words: ["fish", "aquatic", "marine"] },
  {
    icon: "paw",
    color: "amber",
    words: ["animal", "wildlife", "breed", "mammal", "veterinar", "zoolog"],
    exact: ["pet", "pets", "dog", "dogs", "cat", "cats", "bird", "birds"],
  },
  { icon: "tree-pine", color: "cyan", words: ["tree", "forest", "woodland"] },
  {
    icon: "cloud",
    color: "slate",
    words: ["weather", "climate", "meteorolog", "rain"],
  },
  { icon: "moon", color: "purple", words: ["astronom", "cosmolog", "planet"] },
  {
    icon: "bank",
    color: "slate",
    words: [
      "legal",
      "lawyer",
      "litigation",
      "court",
      "judicial",
      "constitution",
      "statute",
      "compliance",
      "regulat",
      "governance",
      "contract",
    ],
    exact: ["law", "laws"],
  },
  {
    icon: "banknote",
    color: "green",
    words: [
      "banking",
      "financ",
      "currenc",
      "payment",
      "payroll",
      "mortgage",
      "insurance",
      "trading",
      "investment",
      "lending",
    ],
    exact: ["bank", "banks", "money", "tax", "taxes", "loan", "loans"],
  },
  {
    icon: "calculator",
    color: "green",
    words: ["accounting", "bookkeeping", "audit", "ledger", "invoic"],
  },
  {
    icon: "shopping-cart",
    color: "orange",
    words: ["ecommerce", "retail", "shopping", "merchandis"],
  },
  {
    icon: "package",
    color: "slate",
    words: [
      "logistics",
      "shipping",
      "inventory",
      "warehous",
      "procurement",
      "packaging",
    ],
  },
  {
    icon: "megaphone",
    color: "orange",
    words: ["marketing", "advertis", "branding", "promotion", "campaign"],
    exact: ["seo"],
  },
  {
    icon: "chart",
    color: "blue",
    words: [
      "metric",
      "analytic",
      "statistic",
      "forecast",
      "benchmark",
      "reporting",
    ],
    exact: ["kpi", "kpis"],
  },
  {
    icon: "building-2",
    color: "slate",
    words: ["architect", "construction", "urban", "propert", "realty"],
  },
  {
    icon: "database",
    color: "purple",
    words: ["data", "database", "dataset", "schema"],
    exact: ["sql", "etl"],
  },
  {
    icon: "server",
    color: "purple",
    words: [
      "server",
      "hosting",
      "devops",
      "deployment",
      "kubernetes",
      "container",
      "infrastructure",
    ],
    exact: ["aws"],
  },
  {
    icon: "memory",
    color: "purple",
    words: [
      "hardware",
      "processor",
      "semiconductor",
      "robotic",
      "neural",
      "machine",
      "electronic",
    ],
    exact: ["ai", "ml", "gpu", "cpu"],
  },
  {
    icon: "wifi",
    color: "sky",
    words: [
      "network",
      "wireless",
      "telecom",
      "bandwidth",
      "protocol",
      "internet",
    ],
  },
  {
    icon: "shield",
    color: "slate",
    words: [
      "security",
      "privacy",
      "encryption",
      "firewall",
      "vulnerabilit",
      "cryptograph",
    ],
  },
  {
    icon: "gamepad-2",
    color: "purple",
    words: ["gaming", "esports"],
    exact: ["game", "games"],
  },
  {
    icon: "palette",
    color: "pink",
    words: ["design", "typography", "illustration", "painting", "drawing"],
    exact: ["art", "arts", "ux", "ui"],
  },
  {
    icon: "camera",
    color: "pink",
    words: ["photograph", "camera", "videograph", "lens"],
  },
  {
    icon: "film",
    color: "pink",
    words: ["film", "cinema", "movie", "animation", "screenwriting"],
  },
  {
    icon: "school",
    color: "amber",
    words: [
      "school",
      "education",
      "academic",
      "university",
      "college",
      "curriculum",
      "teaching",
      "student",
    ],
    exact: ["exam", "exams"],
  },
  {
    icon: "groups",
    color: "blue",
    words: [
      "team",
      "organization",
      "communit",
      "membership",
      "workforce",
      "staff",
    ],
    exact: ["hr"],
  },
  {
    icon: "mail",
    color: "blue",
    words: ["email", "correspondence", "newsletter"],
    exact: ["mail", "inbox", "smtp"],
  },
  {
    icon: "message-circle",
    color: "blue",
    words: ["chat", "messaging", "conversation", "forum"],
  },
  {
    icon: "ball",
    color: "orange",
    words: [
      "sport",
      "football",
      "cricket",
      "basketball",
      "tennis",
      "athletic",
      "soccer",
      "olympic",
    ],
  },
  {
    icon: "trophy",
    color: "orange",
    words: ["championship", "tournament", "league"],
  },
  {
    icon: "award",
    color: "amber",
    words: ["certification", "accreditation", "qualification", "diploma"],
  },
  {
    icon: "car",
    color: "slate",
    words: ["automotive", "vehicle", "transport", "driving", "motoring"],
    exact: ["car", "cars", "ev", "evs"],
  },
  {
    icon: "train-front",
    color: "slate",
    words: ["railway", "railroad", "locomotive", "tramway"],
    exact: ["rail", "train", "trains", "transit", "metro", "subway"],
  },
  {
    icon: "truck",
    color: "slate",
    words: ["trucking", "freight", "haulage", "courier"],
  },
  {
    icon: "ship",
    color: "sky",
    words: [
      "maritime",
      "nautical",
      "shipbuilding",
      "seafaring",
      "harbour",
      "harbor",
    ],
    exact: ["ship", "ships", "boat", "boats", "port", "ports"],
  },
  {
    icon: "plane",
    color: "sky",
    words: ["aviation", "airline", "aircraft", "flight", "aerospace"],
  },
  {
    icon: "atom",
    color: "purple",
    words: ["physics", "quantum", "nuclear", "particle", "relativity"],
    exact: ["atom", "atoms"],
  },
  {
    icon: "flask-conical",
    color: "cyan",
    words: ["chemi", "biochem", "reagent", "titration", "compound"],
  },
  {
    icon: "bolt",
    color: "amber",
    words: ["electric", "energy", "renewable", "petroleum", "voltage", "power"],
    exact: ["oil", "oils", "solar"],
  },
  {
    icon: "droplet",
    color: "sky",
    words: ["water", "hydro", "plumbing", "irrigation", "sanitation"],
  },
  {
    icon: "mountain",
    color: "cyan",
    words: [
      "hiking",
      "climbing",
      "mountaineer",
      "trekking",
      "camping",
      "geolog",
    ],
  },
  {
    icon: "snowflake",
    color: "sky",
    words: ["winter", "skiing", "snowboard", "arctic", "glacier"],
  },
  {
    icon: "gem",
    color: "purple",
    words: [
      "cryptocurrenc",
      "blockchain",
      "bitcoin",
      "ethereum",
      "stablecoin",
      "tokenomics",
    ],
    exact: ["crypto", "nft", "nfts", "defi", "dao", "web3"],
  },
  {
    icon: "radio-tower",
    color: "sky",
    words: ["broadcast", "antenna", "transmitter", "shortwave"],
    exact: ["radio", "radios"],
  },
  {
    icon: "shirt",
    color: "pink",
    words: [
      "fashion",
      "apparel",
      "textile",
      "garment",
      "clothing",
      "footwear",
      "tailoring",
      "knitting",
    ],
  },
  {
    icon: "key",
    color: "slate",
    words: ["authentication", "password", "credential"],
    exact: ["auth", "oauth", "sso", "mfa", "otp", "jwt"],
  },
  {
    icon: "smartphone",
    color: "purple",
    words: ["mobile", "android"],
    exact: ["app", "apps", "ios"],
  },
  {
    icon: "printer",
    color: "slate",
    words: ["printing", "publishing", "typesetting"],
  },
];

type ScoredTerm = { length: number; icon: string; color: string; re: RegExp };

// Compiled once at module load: one regex per term, tagged with the TERM's
// length, which is what the scorer compares. The matched text can't
// discriminate — `\bplan\w*` and `\bplant\w*` both match "Plant" in full.
const SCORED_TERMS: ScoredTerm[] = KEYWORD_RULES.flatMap((rule) => [
  ...rule.words.map((term) => ({
    length: term.length,
    icon: rule.icon,
    color: rule.color,
    re: new RegExp(`\\b${term}\\w*`, "i"),
  })),
  ...(rule.exact ?? []).map((term) => ({
    length: term.length,
    icon: rule.icon,
    color: rule.color,
    re: new RegExp(`\\b${term}\\b`, "i"),
  })),
]);

// Best keyword match for `name`, or null when nothing hits. The longest matched
// term wins (specificity), so `plant` beats `plan` on "Plant Taxonomy"; equal
// lengths keep the earlier rule, since SCORED_TERMS is built in KEYWORD_RULES
// order and the comparison below only accepts a strict improvement.
function matchKeywordRule(
  name: string,
): { icon: string; color: string } | null {
  let best: ScoredTerm | null = null;
  for (const term of SCORED_TERMS) {
    // Length check first: cheaper than the regex, and it skips every term that
    // couldn't beat the incumbent even on a match.
    if (best && term.length <= best.length) continue;
    if (term.re.test(name)) best = term;
  }
  return best ? { icon: best.icon, color: best.color } : null;
}

// Mirrors FALLBACK_PALETTE_KEYS in the web catalog: the deterministic
// id-based color for lists that match no keyword rule, so every list
// gets SOME stable tint rather than a colorless glyph.
const FALLBACK_PALETTE_KEYS = [
  "blue",
  "green",
  "purple",
  "amber",
  "pink",
  "cyan",
  "red",
];

// Resolve the Raycast icon (source + optional tintColor) for a list.
// Full port of the web's resolveListIcon three-tier resolution:
// explicit icon + color, then keyword rules on the list name, then a
// deterministic id-based fallback color with the default list glyph.
// Callers pass name + id so tiers 2 and 3 work; a bare
// { icon, color } call would silently regress to colorless fallbacks.
export function iconForList({
  icon,
  color,
  name = "",
  id = 0,
}: {
  icon: string | null;
  color: string | null;
  name?: string;
  id?: number;
}) {
  let resolvedIcon = icon;
  let resolvedColor = color;
  if (!(icon && LIST_GLYPH_ICON[icon] && color && LIST_COLOR_HEX[color])) {
    const rule = matchKeywordRule(name);
    if (rule) {
      resolvedIcon = icon ?? rule.icon;
      resolvedColor = color ?? rule.color;
    } else {
      resolvedIcon = icon ?? "list";
      resolvedColor =
        color ??
        FALLBACK_PALETTE_KEYS[(Number(id) || 0) % FALLBACK_PALETTE_KEYS.length];
    }
  }
  const source = (resolvedIcon && LIST_GLYPH_ICON[resolvedIcon]) || Icon.List;
  const hex = resolvedColor ? LIST_COLOR_HEX[resolvedColor] : undefined;
  return hex ? { source, tintColor: hex as Color } : { source };
}

// Resolve the Raycast icon for a workspace: its uploaded avatar as a
// circle-masked remote image when one is set, else a type-based fallback
// glyph (a single person for a personal workspace, two people for a
// team). `avatar_url` from /api/v1/workspaces is a full public storage
// URL (services/workspaces.js → getPublicUrl), so it renders directly as
// a remote image. Used by the Search command's workspace dropdown; the
// form list-pickers group by workspace via Form.Dropdown.Section headers,
// which Raycast doesn't let carry an icon, so the avatar can't ride there.
export function iconForWorkspace(
  avatarUrl: string | null | undefined,
  type: string,
): Image.ImageLike {
  if (avatarUrl) {
    return { source: avatarUrl, mask: Image.Mask.Circle };
  }
  return type === "personal" ? Icon.Person : Icon.TwoPeople;
}

// Three-variant chip resolver mirroring app/utils/listVisibility.js
// in the web app — the single source of truth for the globe /
// people / lock chip next to a list name:
//   • public  — anyone can read the list (globe)
//   • shared  — list is private and lives in a team workspace, so
//               the workspace's members can read it (people). The
//               lock icon would mislead here — "private" really
//               means "shared with the team", not "only me".
//   • private — list is private in a personal workspace (lock)
// Keep this and the web helper in lockstep when the variant set
// changes; the on-the-wire shape (isPublic + workspaceType) is the
// raw data the two helpers share.
export function listVisibility(isPublic: boolean, workspaceType: string) {
  if (isPublic) return { label: "Public", icon: Icon.Globe };
  if (workspaceType === "team")
    return { label: "Shared", icon: Icon.TwoPeople };
  return { label: "Private", icon: Icon.Lock };
}
