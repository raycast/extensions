export const annotations = [
  {
    id: "build_in_1647440326836",
    info: {
      name: "File Head Annotation",
      id: "build_in_1647440326836",
      icon: "blank-document-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Annotation"],
    },
    tactions: [
      {
        type: "Live Template",
        content: ["/**\n*\n*@user \n*@email \n*@date $YEAR$-$MONTH$-$DAY$ $HOUR$:$MINUTE$:$SECOND$\n*\n**/"],
      },
    ],
  },
  {
    id: "build_in_1666095794508",
    info: {
      name: "Text Statistics",
      id: "build_in_1666095794508",
      icon: "line-chart-16",
      iconColor: "raycast-secondary-text",
      source: "Build-in",
      visibility: true,
      tag: ["Annotation"],
    },
    tactions: [{ type: "Live Template", content: ["$STATISTICS$"] }],
  },
];

export const ANNOTATIONS_SHORTCUTS = JSON.stringify(annotations);
