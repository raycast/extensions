import { isValidCard, type Card } from "daily-karte";

export function durationInput(value: string): number | null {
  if (!value.trim()) return null;
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440)
    throw new Error("Enter a duration between 1 and 1440 whole minutes, or leave it blank.");
  return duration;
}

export interface CardValues {
  name: string;
  duration: string;
  icon: string;
  emoji: string;
  color: string;
}

export function cardFromValues(id: string, values: CardValues): Card {
  const name = values.name.trim();
  if (!name || name.length > 32) throw new Error("Enter an activity name between 1 and 32 characters.");
  const card = {
    id,
    name,
    duration: durationInput(values.duration),
    icon: values.icon === "custom" ? `emoji:${values.emoji.trim()}` : values.icon,
    color: values.color,
  };
  if (!isValidCard(card)) throw new Error("Choose a valid icon, emoji, and activity color.");
  return card;
}
