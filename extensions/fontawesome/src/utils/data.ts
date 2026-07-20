export const familyStylesByPrefix: { [key: string]: string } = {
  fass: "Sharp, Solid",
  fasr: "Sharp, Regular",
  fasl: "Sharp, Light",
  fast: "Sharp, Thin",
  fad: "Duotone, Solid",
  fadr: "Duotone, Regular",
  fadl: "Duotone, Light",
  fadt: "Duotone, Thin",
  fas: "Classic, Solid",
  far: "Classic, Regular",
  fal: "Classic, Light",
  fat: "Classic, Thin",
  fab: "Classic, Brands",
  fasds: "Sharp Duotone, Solid",
  fasdr: "Sharp Duotone, Regular",
  fasdl: "Sharp Duotone, Light",
  fasdt: "Sharp Duotone, Thin",
};

//these are for determining which icon to use in the family/style selection menu
export function iconForStyle(prefix: string) {
  return `${familyStylesByPrefix[prefix].replace(", ", "-").replace(" ", "-").toLowerCase()}.svg`;
}
