export const baseUrl = "https://betteruptime.com/api/v2";

export const statusMap = {
  paused: "⏸",
  pending: "🔍",
  maintenance: "🚧",
  up: "✅",
  validating: "🤔",
  down: "❌",
} as { [key: string]: string };
