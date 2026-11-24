import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isTemplate, listTemplates } from "../src/daws/ableton/templates";

// listTemplates 的测试里用一个假的后缀判断，不依赖模板的实际形态。
const isFakeTemplate = (entryPath: string, entryName: string) =>
  entryName.endsWith(".tpl") && fs.statSync(entryPath).isDirectory();

let root: string;
let missing: string;
let templatesRoot: string;
let templatePath: string;

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-templates-"));
  missing = path.join(root, "Missing");

  // 顶层：两个模板（乱序创建）、一个普通文件夹、一个隐藏模板、一个普通文件。
  fs.mkdirSync(path.join(root, "Zeta.tpl"));
  fs.mkdirSync(path.join(root, "Alpha.tpl"));
  fs.mkdirSync(path.join(root, ".Hidden.tpl"));
  fs.mkdirSync(path.join(root, "Not A Template"));
  fs.writeFileSync(path.join(root, "notes.txt"), "x");

  // 子文件夹：一组有模板，一组只有第二层才有模板（不该被列出来），一组是空的。
  fs.mkdirSync(path.join(root, "Beats", "Kick.tpl"), { recursive: true });
  fs.mkdirSync(path.join(root, "Beats", "Snare.tpl"), { recursive: true });
  fs.mkdirSync(path.join(root, "Beats", ".Hidden.tpl"), { recursive: true });
  fs.mkdirSync(path.join(root, "Deep", "Inner", "Nested.tpl"), { recursive: true });
  fs.mkdirSync(path.join(root, "Empty"));

  // isTemplate 用真实的 .als 文件。
  templatesRoot = path.join(root, "Live Templates");
  fs.mkdirSync(templatesRoot, { recursive: true });
  templatePath = path.join(templatesRoot, "Starter.als");
  fs.writeFileSync(templatePath, "als content");
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe("listTemplates", () => {
  it("顶层一组、每个直接子文件夹一组，组内按名字排序", () => {
    const groups = listTemplates(root, isFakeTemplate);
    expect(groups.map((group) => [group.title, group.templates.map((template) => template.name)])).toEqual([
      [null, ["Alpha", "Zeta"]],
      ["Beats", ["Kick", "Snare"]],
    ]);
  });

  it("模板的 path 指向模板本身", () => {
    const [top] = listTemplates(root, isFakeTemplate);
    expect(top.templates[0].path).toBe(path.join(root, "Alpha.tpl"));
  });

  it("忽略隐藏文件，也不深入第二层", () => {
    const names = listTemplates(root, isFakeTemplate).flatMap((group) =>
      group.templates.map((template) => template.name),
    );
    expect(names).not.toContain(".Hidden");
    expect(names).not.toContain("Nested");
  });

  it("模板不会被当成子文件夹进去扫描", () => {
    // 顶层模板里放一个模板，如果被当成子文件夹就会多出一组。
    fs.mkdirSync(path.join(root, "Alpha.tpl", "Inside.tpl"));
    const groups = listTemplates(root, isFakeTemplate);
    expect(groups.map((group) => group.title)).toEqual([null, "Beats"]);
    fs.rmSync(path.join(root, "Alpha.tpl", "Inside.tpl"), { recursive: true, force: true });
  });

  it("文件夹不存在时返回空", () => {
    expect(listTemplates(missing, isFakeTemplate)).toEqual([]);
  });
});

describe("isTemplate", () => {
  it("认 .als 文件，不认文件夹", () => {
    expect(isTemplate(templatePath, "Starter.als")).toBe(true);
    expect(isTemplate(templatesRoot, "Live Templates")).toBe(false);
  });
});
