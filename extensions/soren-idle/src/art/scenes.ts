import { HUD_SCENES } from "./hud-index";

export interface Scene {
  frames: number;
  /** Frame shown when the task is not running. */
  poster: number;
  svg(frame: number): string;
}

/** The scene for a task. A null task, or one without a scene, is the idle camp. */
export const sceneFor = (taskId: string | null | undefined): Scene => {
  const task = taskId ? HUD_SCENES[taskId] : undefined;
  return task
    ? { frames: 4, poster: 2, svg: task }
    : { frames: 4, poster: 0, svg: HUD_SCENES.camp };
};

export const SCENE_IDS = Object.keys(HUD_SCENES).filter((id) => id !== "camp");
