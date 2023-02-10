export const times = [
  {
    info: {
      name: "TimeStamp",
      id: "build_in_1647438316609",
      icon: "clock-16",
      source: "Build-in",
      visibility: true,
      tag: ["Time"],
    },
    tactions: [{ type: "Live Template", content: ["$TIMESTAMP$"] }],
  },
  {
    info: {
      name: "TimeNow",
      id: "build_in_1647438477559",
      icon: "clock-16",
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
    info: {
      name: "Stamp->Time",
      id: "build_in_1647440171029",
      icon: "clock-16",
      source: "Build-in",
      visibility: true,
      tag: ["Format", "Time"],
    },
    tactions: [{ type: "Transform", content: ["Stamp to time"] }],
  },
];
export const TIMES_SHORTCUTS = JSON.stringify(times);
