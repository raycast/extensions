import { DatePeriod } from "./types";

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return "< 1m";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function extractIssueKey(input: string): string | null {
  const match = input.match(/([A-Z]+-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function getElapsedTime(startedAt: string): number {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateRange(period: DatePeriod): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (period) {
    case "today": {
      return {
        start: formatDate(today),
        end: formatDate(today),
      };
    }
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: formatDate(yesterday),
        end: formatDate(yesterday),
      };
    }
    case "this-week": {
      const startOfWeek = new Date(today);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      return {
        start: formatDate(startOfWeek),
        end: formatDate(today),
      };
    }
    case "last-7-days": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return {
        start: formatDate(sevenDaysAgo),
        end: formatDate(today),
      };
    }
    case "this-month": {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: formatDate(startOfMonth),
        end: formatDate(today),
      };
    }
  }
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
