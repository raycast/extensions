export const annotations = [
  {
    info: {
      name: "File Head Annotation",
      id: "build_in_1647440326836",
      icon: "doc-plaintext-16",
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
];
export const ANNOTATIONS_SHORTCUTS = JSON.stringify(annotations);
