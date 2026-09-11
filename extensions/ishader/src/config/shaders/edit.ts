import { ShaderParameter, ShaderConfig } from "../types";
import { COMMON_PARAMETERS } from "../common";

// Edit shader configuration - only common parameters
export const EDIT_PARAMETERS: ShaderParameter[] = [
  // Only common parameters (no effect-specific parameters)
  ...COMMON_PARAMETERS,
];

export const EDIT_CONFIG: ShaderConfig = {
  id: "edit",
  name: "Edit",
  description: "Basic image editing with preprocessing parameters",
  processor: "processImageWithEdit",
  parameters: EDIT_PARAMETERS,
};
