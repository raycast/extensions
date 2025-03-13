// src/utils/formatters.ts

//Format date as relative time
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today, " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "yesterday, " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-US");
  }
};
