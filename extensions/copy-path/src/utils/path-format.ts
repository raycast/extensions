export const formatHomePath = (path: string, useTilde: boolean, home: string) =>
  useTilde && (path === home || path.startsWith(home + "/")) ? "~" + path.slice(home.length) : path;

// Leave headroom for Raycast's proportional font and fixed-width HUD.
// This is a character budget, not a measurement of the rendered width.
const HUD_TEXT_LIMIT = 48;

const shorten = (text: string, budget: number) => {
  if (text.length <= budget) return text;
  // Keep the UTF-16 budget exact without splitting a surrogate pair.
  let head = Math.floor((budget - 1) * 0.75);
  const extension = text.lastIndexOf(".");
  if (extension > 0 && text.length - extension < budget - 1) {
    head = Math.min(head, budget - 1 - (text.length - extension));
  }
  const tail = budget - 1 - head;
  return text.slice(0, head).replace(/[\uD800-\uDBFF]$/, "") + "…" + text.slice(-tail).replace(/^[\uDC00-\uDFFF]/, "");
};

export const formatPathHUD = (paths: string[], singleEmoji: string, showEmoji = true) => {
  if (paths.length === 0) return "";
  const prefix = showEmoji ? (paths.length > 1 ? "📑" : singleEmoji) + " " : "";
  const count = paths.length > 1 ? ` (+${paths.length - 1})` : "";
  const title = prefix + paths[0] + count;
  // Short messages return immediately; only long display paths need slicing.
  if (title.length <= HUD_TEXT_LIMIT) return title;

  const budget = HUD_TEXT_LIMIT - prefix.length - count.length;
  const slash = paths[0].lastIndexOf("/");
  const directory = paths[0].slice(0, slash + 1);
  const filename = paths[0].slice(slash + 1);
  let display: string;
  if (directory.length <= budget * 0.6) {
    // Prefer retaining the directory, shortening the filename toward its end.
    display = directory + shorten(filename, budget - directory.length);
  } else {
    // A long directory must leave useful room for the filename too.
    const filenameBudget = Math.min(filename.length, Math.floor(budget * 0.6));
    display = shorten(directory.slice(0, -1), budget - filenameBudget - 1) + "/" + shorten(filename, filenameBudget);
  }
  return prefix + display + count;
};
