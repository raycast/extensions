import type { ToolDefinition } from "../types";
import { areaTools, dateTools, mathTools } from "./calculators";
import { computerTools } from "./computer";
import { generatorTools } from "./generators";
import { textTools } from "./text";
import { validatorTools } from "./validators";

export const tools: ToolDefinition[] = [
  ...generatorTools,
  ...validatorTools,
  ...textTools,
  ...computerTools,
  ...mathTools,
  ...areaTools,
  ...dateTools,
];
