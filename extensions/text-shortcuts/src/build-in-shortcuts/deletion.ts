export const deletions = [
  {
    info: {
      name: "Delete Number",
      id: "build_in_1654847003519",
      icon: "trash-16",
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
    info: {
      name: "Delete Space",
      id: "build_in_1654847067996",
      icon: "trash-16",
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
