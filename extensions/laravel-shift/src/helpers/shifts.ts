import { Command, Group } from "../types/shifts";
import { laravelShiftsGroup } from "../data/shifts/laravel";
import { Clipboard } from "@raycast/api";
import { lumenShiftsGroup } from "../data/shifts/lumen";
import { phpShiftsGroup } from "../data/shifts/php";
import { tailwindShiftsGroup } from "../data/shifts/tailwind";
import { djangoShiftsGroup } from "../data/shifts/django";

export function getShiftGroups(): Group[] {
  return [laravelShiftsGroup, lumenShiftsGroup, phpShiftsGroup, tailwindShiftsGroup, djangoShiftsGroup];
}

export async function copyToClipboard(command: Command) {
  await Clipboard.copy(command.toString());
}
