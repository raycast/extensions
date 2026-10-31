import { StockItem } from "../types";

/** Share of an item's value the locals pay, by Trading Hub level. */
export const HUB_SELL_RATES = [0.6, 0.7, 0.8, 0.9, 1];

/** Discount on everything the locals sell, by Translation Device level. */
export const TRANSLATOR_DISCOUNTS = [0, 0, 0.05, 0.1, 0.15];

/** The locals' working name. Rename freely. */
export const LOCALS = "the Sorenians";

/** What the locals sell: things you cannot get yourself. Expensive on purpose. */
export const STOCK: StockItem[] = [
  { item: "glyph_tablet", price: 60, tier: 1 },
  { item: "star_honey", price: 40, tier: 1 },
  { item: "resonance_coil", price: 180, tier: 2 },
  { item: "skyweave_thread", price: 90, tier: 2 },
  { item: "void_lens", price: 450, tier: 3 },
  { item: "aether_cell", price: 800, tier: 4 },
];

/** A line from the locals, by Translation Device level (0 means none yet). */
export const GREETINGS = [
  "They watch you and make soft, rolling sounds. You have no idea what they want.",
  '"Friend. Trade. Good." You are getting through, one word at a time.',
  '"You work hard, stranger. We will buy what you make."',
  '"Your people are strange, but your hands are honest. Welcome."',
  '"We have a word for those who fall from the sky and stay kind. It means family."',
  '"Everything we have is yours to ask for. Nothing is held back, friend."',
];
