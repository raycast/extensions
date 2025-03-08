export interface SpringEasing {
  name: string;
  url: string;
  values: {
    mass: number;
    stiffness: number;
    damping: number;
  };
}

// Common spring easings for Framer Motion
export const springEasings: SpringEasing[] = [
  {
    name: "Bouyant",
    url: "https://easing.dev/bouyant",
    values: {
      mass: 10,
      stiffness: 900,
      damping: 80,
    },
  },
  {
    name: "Elegant",
    url: "https://easing.dev/elegant",
    values: {
      mass: 1.2,
      stiffness: 150,
      damping: 19,
    },
  },
  {
    name: "Fling",
    url: "https://easing.dev/fling",
    values: {
      mass: 4,
      stiffness: 800,
      damping: 80,
    },
  },
  {
    name: "Swift",
    url: "https://easing.dev/swift",
    values: {
      mass: 0.3,
      stiffness: 280,
      damping: 18,
    },
  },
  {
    name: "Stern",
    url: "https://easing.dev/stern",
    values: {
      stiffness: 550,
      damping: 30,
      mass: 1.2,
    },
  },
  {
    name: "Float",
    url: "https://easing.dev/float",
    values: {
      stiffness: 290,
      damping: 15,
      mass: 2,
    },
  },
];

// Helper function to generate Framer Motion spring configuration
export function generateSpringConfig(
  easing: SpringEasing,
  format: "motion-compact" | "motion-standard" = "motion-compact",
): string {
  const { mass, stiffness, damping } = easing.values;

  if (format === "motion-standard") {
    return `transition={{
  type: "spring",
  mass: ${mass},
  stiffness: ${stiffness},
  damping: ${damping}
}}`;
  }

  // Default to compact format
  return `mass: ${mass},
stiffness: ${stiffness},
damping: ${damping}`;
}
