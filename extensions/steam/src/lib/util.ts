// Item ids are "<context>:<appid>:<search text>"; the search text makes every search's ids new,
// so Raycast drops the old selection instead of keeping the cursor on a game that is still listed
export const itemId = (context: string, appid?: number, search = "") => `${context}:${appid ?? 0}:${search}`;
export const appidFromItemId = (id?: string | null) => Number(id?.split(":")[1] ?? 0);

const relativeDay = (seconds: number) => {
  const days = Math.floor((Date.now() / 1000 - seconds) / 86_400);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 31) return `${days} days ago`;
  return new Date(seconds * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export const addedText = (seconds?: number) => (seconds ? `Added ${relativeDay(seconds)}` : "");
export const playedText = (seconds?: number) => (seconds ? `Played ${relativeDay(seconds)}` : "Not played");
export const playtimeText = (minutes: number) =>
  minutes >= 60 ? `${Math.round(minutes / 60).toLocaleString()}h` : minutes > 0 ? `${minutes}m` : "Not played";
