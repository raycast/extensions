import { TaskDef } from "../../types";
import { SALVAGING_TASKS } from "./salvaging";
import { MINING_TASKS } from "./mining";
import { FORAGING_TASKS } from "./foraging";
import { COOKING_TASKS } from "./cooking";
import { ENGINEERING_TASKS } from "./engineering";
import { FABRICATION_TASKS } from "./fabrication";
import { XENOCHEMISTRY_TASKS } from "./xenochemistry";
import { COMBAT_TASKS } from "./combat";
import { XENOFISHING_TASKS } from "./xenofishing";
import { SMELTING_TASKS } from "./smelting";
import { HACKING_TASKS } from "./hacking";
import { EXPLORATION_TASKS } from "./exploration";
import { COMPANIONS_TASKS } from "./companions";
import { STARGAZING_TASKS } from "./stargazing";

export const TASKS: TaskDef[] = [
  ...SALVAGING_TASKS,
  ...MINING_TASKS,
  ...FORAGING_TASKS,
  ...COOKING_TASKS,
  ...ENGINEERING_TASKS,
  ...FABRICATION_TASKS,
  ...XENOCHEMISTRY_TASKS,
  ...COMBAT_TASKS,
  ...XENOFISHING_TASKS,
  ...SMELTING_TASKS,
  ...HACKING_TASKS,
  ...EXPLORATION_TASKS,
  ...COMPANIONS_TASKS,
  ...STARGAZING_TASKS,
];

export const TASK_BY_ID: Record<string, TaskDef> = Object.fromEntries(TASKS.map((t) => [t.id, t]));
