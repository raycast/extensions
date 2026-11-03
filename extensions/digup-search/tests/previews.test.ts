import assert from "node:assert/strict";
import { test } from "node:test";
import { imageUrl, loadPreview, previewPlan, type Render } from "../src/search/previews";
import { hit } from "./fixtures";

test("pictures Raycast shows as they are come straight from the file; the rest are rendered", () => {
  assert.deepEqual(previewPlan(hit({ kind: "image", segment: "image", path: "/a/Zebra.JPG" })), { type: "file" });
  assert.deepEqual(previewPlan(hit({ kind: "screenshot", segment: "ocr", path: "/a/shot.png" })), { type: "file" });
  assert.deepEqual(previewPlan(hit({ kind: "image", segment: "image", path: "/a/zebra.heic" })), {
    type: "render",
    kind: "image",
  });
  assert.deepEqual(previewPlan(hit({ kind: "image", segment: "image", path: "/a/logo.svg" })), {
    type: "render",
    kind: "image",
  });
});

test("a PDF shows the page that matched, a video the frame; a match by name shows the start", () => {
  assert.deepEqual(previewPlan(hit({ kind: "pdf", segment: "page", loc: 3 })), { type: "render", kind: "pdf", loc: 3 });
  assert.deepEqual(previewPlan(hit({ kind: "pdf", segment: "name" })), { type: "render", kind: "pdf", loc: 1 });
  assert.deepEqual(previewPlan(hit({ kind: "video", segment: "frame", loc: 6.08 })), {
    type: "render",
    kind: "video",
    loc: 6.08,
  });
  assert.deepEqual(previewPlan(hit({ kind: "video", segment: "audio", loc: 25 })), { type: "render", kind: "video", loc: 25 });
  assert.deepEqual(previewPlan(hit({ kind: "video", segment: "name" })), { type: "render", kind: "video" });
});

test("documents, recordings, code and kinds this version doesn't know have no picture", () => {
  for (const kind of ["doc", "audio", "code", "hologram"]) assert.deepEqual(previewPlan(hit({ kind })), { type: "none" });
});

test("a path becomes a file URL Markdown can hold, whatever is in it", () => {
  assert.equal(
    imageUrl("/Users/sam/My Pics/a (1).jpg", { height: 184 }),
    "file:///Users/sam/My%20Pics/a%20%281%29.jpg?raycast-height=184",
  );
  assert.equal(
    imageUrl("/Users/sam/照片/海滩#1?.png", { width: 200 }),
    "file:///Users/sam/%E7%85%A7%E7%89%87/%E6%B5%B7%E6%BB%A9%231%3F.png?raycast-width=200",
  );
});

test("a preview is the file itself, or what the helper renders", async () => {
  const asked: unknown[][] = [];
  const render: Render = async (...args) => {
    asked.push(args);
    return "/idx/previews/1.jpg";
  };
  assert.equal(
    await loadPreview(hit({ kind: "image", segment: "image", path: "/a/z.png" }), render),
    "file:///a/z.png?raycast-height=184",
  );
  assert.equal(asked.length, 0);
  assert.equal(
    await loadPreview(hit({ kind: "pdf", segment: "page", loc: 3, path: "/a/lease.pdf" }), render),
    "file:///idx/previews/1.jpg?raycast-width=380",
  );
  assert.deepEqual(asked, [["/a/lease.pdf", "pdf", 3, 1024]]);
  assert.equal(await loadPreview(hit({ kind: "doc", segment: "chunk" }), render), undefined);
});

test("a file that is gone, or can't be rendered, simply has no preview", async () => {
  const render: Render = async () => {
    throw new Error("no such file");
  };
  assert.equal(await loadPreview(hit({ kind: "video", segment: "frame", loc: 6, path: "/gone.mp4" }), render), undefined);
});

test("a picture or a frame is sized by its height, so a tall one shows whole; a page by its width, so it can be read", async () => {
  // The detail pane shows about 200 points of height above the facts. Sized by width, a phone screenshot or a 9:16
  // video came out some 800 points tall, and only its top quarter was to be seen.
  const render: Render = async (path) => `/idx/previews/${path.split("/").pop()}.jpg`;
  const tall = { kind: "screenshot", segment: "ocr", path: "/s/phone.png", info: { width: "1170", height: "2532" } };
  assert.match((await loadPreview(hit(tall), render)) ?? "", /phone\.png\?raycast-height=184$/);
  const heic = hit({ kind: "image", segment: "image", path: "/p/IMG_0001.HEIC" });
  assert.match((await loadPreview(heic, render)) ?? "", /IMG_0001\.HEIC\.jpg\?raycast-height=184$/);
  const clip = hit({ kind: "video", segment: "frame", loc: 6, path: "/v/reel.mp4" });
  assert.match((await loadPreview(clip, render)) ?? "", /reel\.mp4\.jpg\?raycast-height=184$/);
  const page = hit({ kind: "pdf", segment: "page", loc: 3, path: "/d/lease.pdf" });
  assert.match((await loadPreview(page, render)) ?? "", /lease\.pdf\.jpg\?raycast-width=380$/);
});

test("parentheses in a file name don't end the Markdown link early", () => {
  assert.equal(imageUrl("/p/photo (1).jpg", { height: 184 }), "file:///p/photo%20%281%29.jpg?raycast-height=184");
  assert.equal(imageUrl("/p/photo).jpg", { height: 184 }), "file:///p/photo%29.jpg?raycast-height=184");
});
