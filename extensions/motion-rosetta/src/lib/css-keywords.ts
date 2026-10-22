// CSS Easing Functions Level 1, §2.1–2.2 (not Figma preset values).
// https://www.w3.org/TR/css-easing-1/#cubic-bezier-easing-functions
export const CSS_KEYWORDS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
} satisfies Record<string, [number, number, number, number]>;
