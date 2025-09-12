/**
 * Diaper colors available in the Baby Buddy system
 */
export const DIAPER_COLORS = [
  { id: "black", name: "Black" },
  { id: "brown", name: "Brown" },
  { id: "green", name: "Green" },
  { id: "yellow", name: "Yellow" },
  { id: "white", name: "White" },
];

/**
 * Feeding types available in the Baby Buddy system
 */
export const FEEDING_TYPES = [
  { id: "breast milk", name: "Breast Milk" },
  { id: "formula", name: "Formula" },
  { id: "solid food", name: "Solid Food" },
  { id: "fortified breast milk", name: "Fortified Breast Milk" },
];

/**
 * Feeding methods available in the Baby Buddy system
 */
export const FEEDING_METHODS = [
  { id: "bottle", name: "Bottle" },
  { id: "left breast", name: "Left Breast" },
  { id: "right breast", name: "Right Breast" },
  { id: "both breasts", name: "Both Breasts" },
  { id: "parent fed", name: "Parent Fed" },
  { id: "self fed", name: "Self Fed" },
];

/**
 * Sleep types available in the Baby Buddy system
 */
export const SLEEP_TYPES = [
  { id: true, name: "Nap" },
  { id: false, name: "Night Sleep" },
];

/**
 * Common timer types in Baby Buddy
 */
export const TIMER_TYPES = [
  { id: "feeding", name: "Feeding" },
  { id: "pumping", name: "Pumping" },
  { id: "sleep", name: "Sleep" },
  { id: "tummy-time", name: "Tummy Time" },
  { id: "other", name: "Other" },
];
