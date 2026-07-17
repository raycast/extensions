export const deletions = [
  {
    id: "build_in_1654847003519",
    info: {
      name: "Delete Number",
      id: "build_in_1654847003519",
      icon: "trash-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Deletion"],
    },
    tactions: [
      {
        type: "Delete",
        content: ["/\\d/g"],
      },
    ],
  },
  {
    id: "build_in_1654847067996",
    info: {
      name: "Delete Space",
      id: "build_in_1654847067996",
      icon: "trash-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Deletion"],
    },
    tactions: [
      {
        type: "Delete",
        content: ["/\\s/g"],
      },
    ],
  },
];

export const DELETIONS_SHORTCUTS = JSON.stringify(deletions);
