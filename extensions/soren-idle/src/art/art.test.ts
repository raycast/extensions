import { describe, expect, it } from "vitest";
import { BUILDINGS, TASKS } from "../engine/data";
import { BUILDING_ART_IDS, buildingSvg } from "./hud-base";
import { SCENE_IDS, sceneFor } from "./scenes";

describe("terminal art", () => {
  it("has a scene for every task", () => {
    for (const task of TASKS) expect(SCENE_IDS, task.id).toContain(task.id);
  });

  it("renders every frame of every scene, and the idle camp", () => {
    for (const id of [...SCENE_IDS, null]) {
      const scene = sceneFor(id);
      expect(scene.frames).toBe(4);
      for (let frame = 0; frame < scene.frames; frame++) {
        const svg = scene.svg(frame);
        expect(svg.startsWith("<svg"), `${id} frame ${frame}`).toBe(true);
        expect(svg.endsWith("</svg>")).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        // data URIs are re-sent while a task animates, so keep frames small
        expect(svg.length).toBeLessThan(60_000);
      }
    }
  });

  it("is deterministic", () => {
    expect(sceneFor("mine_ferrite").svg(1)).toBe(sceneFor("mine_ferrite").svg(1));
  });

  it("animates", () => {
    const scene = sceneFor("mine_ferrite");
    expect(scene.svg(0)).not.toBe(scene.svg(2));
  });

  it("has static art for every building, built or not", () => {
    expect([...BUILDING_ART_IDS].sort()).toEqual(BUILDINGS.map((b) => b.id).sort());
    for (const def of BUILDINGS) {
      for (const level of [0, 1, def.maxLevel]) {
        const svg = buildingSvg(def.id, level);
        expect(svg.startsWith("<svg"), def.id).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(svg.length).toBeLessThan(60_000);
      }
    }
  });
});
