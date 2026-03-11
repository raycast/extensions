import type { ProfileDefinition, ProfileId } from "../types";
import { MANUAL_PROFILES } from "./manual";
import { BEAM_PROFILES } from "./beams";
import { CHANNEL_ANGLE_PROFILES } from "./channels-angles";
import { TEE_PROFILES } from "./tees";
import {
  SHS_STANDARD_PROFILES,
  RHS_STANDARD_PROFILES,
} from "./hollow-standard";
import { ANGLE_STANDARD_PROFILES } from "./angles-standard";

export { MANUAL_PROFILES } from "./manual";
export { BEAM_PROFILES } from "./beams";
export { CHANNEL_ANGLE_PROFILES } from "./channels-angles";
export { TEE_PROFILES } from "./tees";
export {
  SHS_STANDARD_PROFILES,
  RHS_STANDARD_PROFILES,
} from "./hollow-standard";
export { ANGLE_STANDARD_PROFILES } from "./angles-standard";

/**
 * All profile definitions, ordered: Bars → Tubes → Plates & Sheets → Structural
 */
export const PROFILE_DEFINITIONS: ProfileDefinition[] = [
  ...MANUAL_PROFILES,
  ...SHS_STANDARD_PROFILES,
  ...RHS_STANDARD_PROFILES,
  ...BEAM_PROFILES,
  ...CHANNEL_ANGLE_PROFILES,
  ...TEE_PROFILES,
  ...ANGLE_STANDARD_PROFILES,
];

export function getProfileById(
  profileId: ProfileId,
): ProfileDefinition | undefined {
  return PROFILE_DEFINITIONS.find((profile) => profile.id === profileId);
}
