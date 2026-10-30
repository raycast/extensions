import { renderHud } from "./hud";
import { camp } from "./hud-base";
import { COMBAT_SCENES } from "./hud-combat";
import { FORGE_SCENES } from "./hud-forge";
import {
  berserker,
  fortune,
  fury,
  honeyRation,
  quicksilver,
  ration,
  swift,
  windfall,
} from "./hud-lab";
import { glowcap, hydroGlowcap, hydroLumina, hydroSweetroot, sweetroot } from "./hud-grow";
import { cargo, ferrite, mining, salvaging, wiring } from "./hud-scenes";

type SceneSvg = (frame: number) => string;

/** The HUD scene for each task that has one. Tasks not listed here still use the older art. */
export const HUD_SCENES: Record<string, SceneSvg> = {
  camp: (frame) => renderHud(camp, frame, 127),
  salvage_hull: (frame) => renderHud(salvaging, frame, 11),
  salvage_wiring: (frame) => renderHud(wiring, frame, 13),
  salvage_cargo: (frame) => renderHud(cargo, frame, 17),
  mine_ferrite: (frame) => renderHud(ferrite, frame, 19),
  mine_lumina: (frame) => renderHud(mining, frame, 23),
  forage_glowcap: (frame) => renderHud(glowcap, frame, 29),
  forage_sweetroot: (frame) => renderHud(sweetroot, frame, 31),
  hydro_glowcap_bed: (frame) => renderHud(hydroGlowcap, frame, 37),
  hydro_sweetroot_bed: (frame) => renderHud(hydroSweetroot, frame, 41),
  hydro_lumina_bloom: (frame) => renderHud(hydroLumina, frame, 43),
  craft_ration: (frame) => renderHud(ration, frame, 47),
  craft_honey_ration: (frame) => renderHud(honeyRation, frame, 53),
  brew_swift: (frame) => renderHud(swift, frame, 59),
  brew_fortune: (frame) => renderHud(fortune, frame, 61),
  brew_fury: (frame) => renderHud(fury, frame, 67),
  brew_quicksilver: (frame) => renderHud(quicksilver, frame, 71),
  brew_windfall: (frame) => renderHud(windfall, frame, 73),
  brew_berserker: (frame) => renderHud(berserker, frame, 79),
  ...Object.fromEntries(
    Object.entries(COMBAT_SCENES).map(([id, draw], i) => [
      id,
      (frame: number) => renderHud(draw, frame, 83 + i * 2),
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(FORGE_SCENES).map(([id, draw], i) => [
      id,
      (frame: number) => renderHud(draw, frame, 101 + i * 2),
    ]),
  ),
};

/** Drawn but not shown in the game yet, for review. Moves into HUD_SCENES once approved. */
export const PREVIEW_SCENES: Record<string, SceneSvg> = {};
