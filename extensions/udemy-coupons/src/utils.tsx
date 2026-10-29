import { useEffect, useState } from "react";
import { Action, Color, Icon } from "@raycast/api";
import { formatDistance } from "date-fns";
import { TELEGRAM_URL } from "./api";

export function getCategoryIcon(category: string): Icon {
  const categoryMap: Record<string, Icon> = {
    Development: Icon.Code,
    Business: Icon.LockUnlocked,
    "Finance & Accounting": Icon.BankNote,
    "IT & Software": Icon.ComputerChip,
    "Office Productivity": Icon.Document,
    "Personal Development": Icon.PersonCircle,
    Design: Icon.Brush,
    Marketing: Icon.Megaphone,
    "Health & Fitness": Icon.Heart,
    Music: Icon.Music,
    "Teaching & Academics": Icon.Book,
    "Photography & Video": Icon.Camera,
    Lifestyle: Icon.Star,
  };

  return categoryMap[category] || Icon.Tag;
}

export function getRatingColor(rating: string | null | undefined): Color {
  const value = Number(rating) || 0;
  if (value >= 4.5) return Color.Green;
  if (value >= 4.0) return Color.Blue;
  if (value >= 3.5) return Color.Yellow;
  return Color.Orange;
}

export function getStarDisplay(rating: string | null | undefined): string {
  const value = Number(rating) || 0;
  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return "⭐".repeat(fullStars) + (hasHalfStar ? "½" : "") + "☆".repeat(emptyStars);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return formatDistance(date, new Date(), {
    addSuffix: true,
  });
}

export function formatRating(rating: string | null | undefined): string {
  const value = Number(rating);
  if (!rating || isNaN(value)) return "No rating";
  return `⭐ ${value.toFixed(1)}`;
}

export function parseEnrollments(enrollments: string | null | undefined): number {
  if (enrollments == null) return 0;
  const value = Number(String(enrollments).replace(/[^0-9.]/g, ""));
  return isNaN(value) ? 0 : value;
}

export function formatEnrollments(enrollments: string | null | undefined): string {
  if (enrollments == null || enrollments === "") return "";
  const value = parseEnrollments(enrollments);
  if (value === 0) return String(enrollments);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M enrolled`;
  if (value >= 10000) return `${(value / 1000).toFixed(1)}K enrolled`;
  if (value >= 1000) return `${Math.round(value / 1000)}K enrolled`;
  return `${Math.round(value)} enrolled`;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

export function TelegramAction() {
  return <Action.OpenInBrowser url={TELEGRAM_URL} title="Join Our Telegram Channel" icon={Icon.AirplaneTakeoff} />;
}
