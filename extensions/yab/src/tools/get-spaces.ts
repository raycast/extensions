import { readWindow } from "../yab";

/** Yab's spaces in their order: id, title, emoji, whether it is on screen, and how many pins, kept tabs and today's tabs each holds. */
export default async function tool() {
  return (await readWindow())?.spaces ?? [];
}
