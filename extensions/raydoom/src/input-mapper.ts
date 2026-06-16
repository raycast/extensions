/**
 * Input Mapper - Maps Raycast keyboard shortcuts to Doom key codes
 */

// Import DoomKey from raydoom-core
import { DoomKey } from "raydoom-core";

/**
 * Available input actions for Doom
 */
export enum InputAction {
  MOVE_FORWARD = "move_forward",
  MOVE_BACKWARD = "move_backward",
  TURN_LEFT = "turn_left",
  TURN_RIGHT = "turn_right",
  STRAFE_LEFT = "strafe_left",
  STRAFE_RIGHT = "strafe_right",
  USE = "use",
  FIRE = "fire",
  WEAPON_1 = "weapon_1",
  WEAPON_2 = "weapon_2",
  WEAPON_3 = "weapon_3",
  WEAPON_4 = "weapon_4",
  WEAPON_5 = "weapon_5",
  WEAPON_6 = "weapon_6",
  WEAPON_7 = "weapon_7",
  ESCAPE = "escape",
  ENTER = "enter",
  YES = "yes",
  NO = "no",
  MAP = "map",
  PAUSE = "pause",
}

/**
 * Map of input actions to Doom key codes
 */
export const INPUT_ACTION_MAP: Record<InputAction, number> = {
  [InputAction.MOVE_FORWARD]: DoomKey.KEY_UPARROW,
  [InputAction.MOVE_BACKWARD]: DoomKey.KEY_DOWNARROW,
  [InputAction.TURN_LEFT]: DoomKey.KEY_LEFTARROW,
  [InputAction.TURN_RIGHT]: DoomKey.KEY_RIGHTARROW,
  [InputAction.STRAFE_LEFT]: DoomKey.KEY_STRAFE_L,
  [InputAction.STRAFE_RIGHT]: DoomKey.KEY_STRAFE_R,
  [InputAction.USE]: DoomKey.KEY_USE,
  [InputAction.FIRE]: DoomKey.KEY_FIRE,
  [InputAction.WEAPON_1]: 49, // '1'
  [InputAction.WEAPON_2]: 50, // '2'
  [InputAction.WEAPON_3]: 51, // '3'
  [InputAction.WEAPON_4]: 52, // '4'
  [InputAction.WEAPON_5]: 53, // '5'
  [InputAction.WEAPON_6]: 54, // '6'
  [InputAction.WEAPON_7]: 55, // '7'
  [InputAction.ESCAPE]: DoomKey.KEY_ESCAPE,
  [InputAction.ENTER]: DoomKey.KEY_ENTER,
  [InputAction.YES]: DoomKey.KEY_Y,
  [InputAction.NO]: DoomKey.KEY_N,
  [InputAction.MAP]: DoomKey.KEY_TAB,
  [InputAction.PAUSE]: DoomKey.KEY_PAUSE,
};

/**
 * Get Doom key code for an input action
 */
export function getDoomKey(action: InputAction): number {
  return INPUT_ACTION_MAP[action];
}

/**
 * Default key release delays per action (ms)
 * Movement keys: longer delay = smoother feel, less pressing needed
 * Action/menu keys: shorter delay = more responsive
 */
export const ACTION_DELAYS: Record<InputAction, number> = {
  [InputAction.MOVE_FORWARD]: 200,
  [InputAction.MOVE_BACKWARD]: 200,
  [InputAction.TURN_LEFT]: 250,
  [InputAction.TURN_RIGHT]: 250,
  [InputAction.STRAFE_LEFT]: 250,
  [InputAction.STRAFE_RIGHT]: 250,
  [InputAction.FIRE]: 100,
  [InputAction.USE]: 100,
  [InputAction.WEAPON_1]: 50,
  [InputAction.WEAPON_2]: 50,
  [InputAction.WEAPON_3]: 50,
  [InputAction.WEAPON_4]: 50,
  [InputAction.WEAPON_5]: 50,
  [InputAction.WEAPON_6]: 50,
  [InputAction.WEAPON_7]: 50,
  [InputAction.ESCAPE]: 50,
  [InputAction.ENTER]: 50,
  [InputAction.YES]: 50,
  [InputAction.NO]: 50,
  [InputAction.MAP]: 50,
  [InputAction.PAUSE]: 50,
};

// Movement actions that can be customized via preferences
const FORWARD_BACKWARD_ACTIONS = new Set([InputAction.MOVE_FORWARD, InputAction.MOVE_BACKWARD]);

const TURN_STRAFE_ACTIONS = new Set([
  InputAction.TURN_LEFT,
  InputAction.TURN_RIGHT,
  InputAction.STRAFE_LEFT,
  InputAction.STRAFE_RIGHT,
]);

/**
 * Get the key release delay for an action.
 * Optionally accepts user-configured delays for movement categories.
 */
export function getActionDelay(action: InputAction, forwardBackwardDelay?: number, turnStrafeDelay?: number): number {
  if (forwardBackwardDelay !== undefined && FORWARD_BACKWARD_ACTIONS.has(action)) {
    return forwardBackwardDelay;
  }
  if (turnStrafeDelay !== undefined && TURN_STRAFE_ACTIONS.has(action)) {
    return turnStrafeDelay;
  }
  return ACTION_DELAYS[action] ?? 100;
}
