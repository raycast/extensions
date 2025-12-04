import { Group, Shift } from "../../types/shifts";

function getShifts(): Shift[] {
  return [{ code: "LTL", name: "Lumen to Laravel", description: "Convert from Lumen to Laravel" }];
}

export const lumenShiftsGroup: Group = {
  name: "Lumen",
  shifts: getShifts(),
};
