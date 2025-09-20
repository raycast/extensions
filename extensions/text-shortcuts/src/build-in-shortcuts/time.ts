export const times = [
  {
    id: "build_in_1647438316609",
    info: {
      name: "TimeStamp",
      id: "build_in_1647438316609",
      icon: "clock-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Time"],
    },
    tactions: [{ type: "Live Template", content: ["$TIMESTAMP$"] }],
  },
  {
    id: "build_in_1647438477559",
    info: {
      name: "TimeNow",
      id: "build_in_1647438477559",
      icon: "clock-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Time"],
    },
    tactions: [
      {
        type: "Live Template",
        content: ["$YEAR$-$MONTH$-$DAY$ $HOUR$:$MINUTE$:$SECOND$"],
      },
    ],
  },
  {
    id: "build_in_1647440171029",
    info: {
      name: "Stamp->Time",
      id: "build_in_1647440171029",
      icon: "clock-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Format", "Time"],
    },
    tactions: [{ type: "Transform", content: ["Stamp to time"] }],
  },
];

export const TIMES_SHORTCUTS = JSON.stringify(times);
