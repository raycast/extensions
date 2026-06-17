import { Group, Shift } from "../../types/shifts";

function getShifts(): Shift[] {
  return [
    { code: "T1", name: "Tailwind 1.x", description: "From Tailwind 0.x to Tailwind 1.x" },
    { code: "T2", name: "Tailwind 2.x", description: "From Tailwind 1.x to Tailwind 2.x" },
    { code: "T3", name: "Tailwind 3.x", description: "From Tailwind 2.x to Tailwind 3.x" },
    { code: "TUI", name: "Tailwind UI", description: "From Tailwind UI 1.x to Tailwind UI 2.x" },
    { code: "TL", name: "Tailwind Linter", description: "Streamline your Tailwind project" },
    { code: "TC", name: "Tailwind Converter", description: "Convert Bootstrap to Tailwind" },
  ];
}

export const tailwindShiftsGroup: Group = {
  name: "Tailwind",
  shifts: getShifts(),
};
