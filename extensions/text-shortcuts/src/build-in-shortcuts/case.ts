export const cases = [
  {
    info: {
      name: "UPPER CASE",
      id: "build_in_1647439015702",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["UPPER CASE"] }],
  },
  {
    info: {
      name: "lower case",
      id: "build_in_1647439044772",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["lower case"] }],
  },
  {
    info: {
      name: "camelCase",
      id: "build_in_1647438658683",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["camelCase"] }],
  },
  {
    info: {
      name: "PascalCase",
      id: "build_in_1647439067142",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["PascalCase"] }],
  },
  {
    info: {
      name: "snake_case",
      id: "build_in_1647439125162",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["snake_case"] }],
  },
  {
    info: {
      name: "kebab-case",
      id: "build_in_1647439156694",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["kebab-case"] }],
  },
  {
    info: {
      name: "Title case",
      id: "build_in_1647440060447",
      icon: "pencil-16",
      source: "Build-in",
      visibility: true,
      tag: ["Case"],
    },
    tactions: [{ type: "Name Case", content: ["Title case"] }],
  },
  {
    info: {
      name: "camelCase to snake_case",
      id: "build_in_1651306768124",
      icon: "pencil-16",
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
    info: {
      name: "camelCase to kebab-case",
      id: "build_in_1651306783829",
      icon: "pencil-16",
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
    info: {
      name: "snake_case to camelCase",
      id: "build_in_1651306867056",
      icon: "pencil-16",
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
    info: {
      name: "kebab-case to camelCase",
      id: "build_in_1651306886878",
      icon: "pencil-16",
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
