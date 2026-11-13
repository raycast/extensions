import { FISH_SCENES } from "./hud-fish";
import { SMELT_SCENES } from "./hud-smelt";
import { HACK_SCENES } from "./hud-hack";
import { FAB_SCENES } from "./hud-fab";
import { EXPLORE_SCENES } from "./hud-explore";
import { SKY_SCENES } from "./hud-sky";
import { PET_SCENES } from "./hud-pets";
import { WORLD_SCENES } from "./hud-world";
import { KITCHEN_SCENES } from "./hud-kitchen";
import { CROP_SCENES } from "./hud-crops";
import { Scene } from "./hud-kit";

/** Scenes for the tasks added after the first release, by task id. */
export const NEW_SCENES: Record<string, Scene> = {
  ...FISH_SCENES,
  ...SMELT_SCENES,
  ...HACK_SCENES,
  ...CROP_SCENES,
  ...KITCHEN_SCENES,
  ...WORLD_SCENES,
  ...PET_SCENES,
  ...EXPLORE_SCENES,
  ...FAB_SCENES,
  ...SKY_SCENES,
};
