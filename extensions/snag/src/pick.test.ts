// node --test src/   (Node strips the types, no test framework needed)
import { strictEqual, throws } from "node:assert";
import { test } from "node:test";
import { pick } from "./pick.ts";

const anim = { id: "a", name: "anim", animated: true, files: ["1x.webp", "1x.gif", "2x.webp", "2x.gif"] };
const stat = { id: "s", name: "stat", animated: false, files: ["1x.webp", "1x.png", "2x.webp", "2x.png"] };

test("animated emotes paste as GIF", () => strictEqual(pick(anim, "2x").ext, "gif"));
test("static emotes paste as PNG", () => strictEqual(pick(stat, "2x").ext, "png"));
test("requested size wins", () => strictEqual(pick(stat, "1x").size, "1x"));
test("missing size falls back", () => strictEqual(pick(anim, "4x").size, "1x"));
test("gifless animated falls back to webp", () => strictEqual(pick({ ...anim, files: ["2x.webp"] }, "2x").ext, "webp"));
test("url is built from the file the API listed", () =>
  strictEqual(pick(anim, "2x").url, "https://cdn.7tv.app/emote/a/2x.gif"));
test("no usable file throws", () => throws(() => pick({ ...anim, files: ["2x.avif"] }, "2x")));
