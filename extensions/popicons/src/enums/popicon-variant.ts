const PopiconVariant = {
  Solid: "solid",
  Line: "line",
  Duotone: "duotone",
} as const;

type PopiconVariant = (typeof PopiconVariant)[keyof typeof PopiconVariant];

export { PopiconVariant };
