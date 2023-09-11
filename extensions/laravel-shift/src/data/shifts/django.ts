import { Group, Shift } from "../../types/shifts";

function getShifts(): Shift[] {
  return [{ code: "D41", name: "Django 4.1", description: "From Django 4.0 to Django 4.1" }];
}

export const djangoShiftsGroup: Group = {
  name: "Django",
  shifts: getShifts(),
};
