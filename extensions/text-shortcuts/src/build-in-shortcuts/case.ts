export const cases = [
  {
    id: "build_in_1647439015702",
    info: {
      name: "UPPER CASE",
      id: "build_in_1647439015702",
      icon: "uppercase-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["UPPER CASE"] }],
  },
  {
    id: "build_in_1647439044772",
    info: {
      name: "lower case",
      id: "build_in_1647439044772",
      icon: "lowercase-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["lower case"] }],
  },
  {
    id: "build_in_1647438658683",
    info: {
      name: "camelCase",
      id: "build_in_1647438658683",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["camelCase"] }],
  },
  {
    id: "build_in_1647439067142",
    info: {
      name: "PascalCase",
      id: "build_in_1647439067142",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["PascalCase"] }],
  },
  {
    id: "build_in_1647439125162",
    info: {
      name: "snake_case",
      id: "build_in_1647439125162",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["snake_case"] }],
  },
  {
    id: "build_in_1647439156694",
    info: {
      name: "kebab-case",
      id: "build_in_1647439156694",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["kebab-case"] }],
  },
  {
    id: "build_in_1647440060447",
    info: {
      name: "Title case",
      id: "build_in_1647440060447",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["Title case"] }],
  },
  {
    id: "build_in_1651306768124",
    info: {
      name: "camelCase to snake_case",
      id: "build_in_1651306768124",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [
      {
        type: "Name Case",
        content: ["camelCase to snake_case"],
      },
    ],
  },
  {
    id: "build_in_1651306783829",
    info: {
      name: "camelCase to kebab-case",
      id: "build_in_1651306783829",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [
      {
        type: "Name Case",
        content: ["camelCase to kebab-case"],
      },
    ],
  },
  {
    id: "build_in_1651306867056",
    info: {
      name: "snake_case to camelCase",
      id: "build_in_1651306867056",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [
      {
        type: "Replace",
        content: ["-", " "],
      },
      {
        type: "Name Case",
        content: ["camelCase"],
      },
    ],
  },
  {
    id: "build_in_1651306886878",
    info: {
      name: "kebab-case to camelCase",
      id: "build_in_1651306886878",
      icon: "text-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [
      {
        type: "Replace",
        content: ["-", " "],
      },
      {
        type: "Name Case",
        content: ["camelCase"],
      },
    ],
  },
];

export const CASES_SHORTCUTS = JSON.stringify(cases);
