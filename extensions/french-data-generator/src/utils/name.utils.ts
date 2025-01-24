import { lastNamesDatabase } from "../data/lastNames";
import { namesDatabase } from "../data/names";

// Random generation of names with gender
export function getRandomName(): { name: string; gender: "male" | "female" } {
  const gender = Math.random() < 0.5 ? "male" : "female"; // Equal probability for male/female
  const firstNames = namesDatabase[gender];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNamesDatabase[Math.floor(Math.random() * lastNamesDatabase.length)];
  return { name: `${firstName} ${lastName}`, gender };
}
