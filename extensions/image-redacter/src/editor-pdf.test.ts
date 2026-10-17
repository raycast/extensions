import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { createCanvas, type Canvas } from "@napi-rs/canvas";
import * as PDFLib from "pdf-lib";
import {
  getDocument,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";

type Mask = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  effect: string;
  color: string;
};
type Page = {
  source: Canvas | null;
  sourcePromise?: Promise<Canvas> | null;
  masks: Mask[];
  widthPt: number;
  heightPt: number;
};
type Editor = {
  state: {
    kind: string;
    pages: Page[];
    pdf: PDFDocumentProxy | object;
    pdfBytes: Uint8Array;
    pageIndex: number;
    entitlement: { plan: string };
  };
  newPage(source: Canvas | null, details?: object): Page;
  pageSource(index: number): Promise<Canvas>;
  validDraft(mask: object): boolean;
  addMask(mask: object): boolean;
  buildRedactedPdf(onPage: (index: number) => void): Promise<Blob>;
};

function editor(searchable = false) {
  const canvas = () => {
    const result = createCanvas(1, 1);
    return Object.assign(result, {
      toBlob(callback: (blob: Blob) => void) {
        callback(
          new Blob([new Uint8Array(result.toBuffer("image/png"))], {
            type: "image/png",
          }),
        );
      },
    });
  };
  const image = canvas();
  const overlay = canvas();
  let terminated = 0;
  const source = readFileSync(resolve("assets/editor.js"), "utf8").replace(
    / {2}start\(\)\.catch\(\(error\) => \{[\s\S]*?\n {2}\}\);/,
    "globalThis.editor = { state, newPage, pageSource, buildRedactedPdf, validDraft, addMask };",
  );
  const sandbox = {
    editor: undefined as Editor | undefined,
    Blob,
    URL,
    location: { href: "http://127.0.0.1:3000/session/" },
    Uint8Array,
    ArrayBuffer,
    document: {
      querySelector: (selector: string) =>
        selector === "#imageCanvas"
          ? image
          : selector === "#overlayCanvas"
            ? overlay
            : { checked: searchable },
      createElement: () => canvas(),
    },
    window: {
      PDFLib,
      addEventListener() {},
      Tesseract: {
        createWorker: async () => ({
          recognize: async () => ({
            data: {
              words: [
                {
                  text: "SECRET42",
                  confidence: 99,
                  bbox: { x0: 104, y0: 178, x1: 260, y1: 210 },
                },
                {
                  text: "TOUCHING",
                  confidence: 99,
                  bbox: { x0: 320, y0: 180, x1: 360, y1: 210 },
                },
                {
                  text: "PUBLIC42",
                  confidence: 99,
                  bbox: { x0: 104, y0: 284, x1: 260, y1: 310 },
                },
              ],
            },
          }),
          terminate: async () => {
            terminated++;
          },
        }),
      },
    },
    setInterval() {},
  };
  runInNewContext(
    readFileSync(resolve("assets/vendor/pdf-lib.min.js"), "utf8") +
      "\nwindow.PDFLib = PDFLib;\n" +
      source,
    sandbox,
  );
  sandbox.editor!.state.kind = "pdf";
  sandbox.editor!.state.entitlement = { plan: "pro" };
  return { api: sandbox.editor!, terminated: () => terminated };
}

async function fixture() {
  const original = await PDFLib.PDFDocument.create();
  original.setTitle("PRIVATE METADATA");
  const first = original.addPage([300, 200]);
  first.drawText("SECRET42", { x: 50, y: 100, size: 14 });
  first.drawText("PUBLIC42", { x: 50, y: 50, size: 14 });
  const second = original.addPage([300, 200]);
  second.drawText("UNTOUCHED PAGE", { x: 50, y: 100, size: 14 });
  for (const page of [first, second]) {
    const annotation = original.context.register(
      original.context.obj({
        Type: "Annot",
        Subtype: "Text",
        Rect: [10, 10, 20, 20],
        Contents: PDFLib.PDFString.of("PRIVATE ANNOTATION"),
      }),
    );
    page.node.set(
      PDFLib.PDFName.of("Annots"),
      original.context.obj([annotation]),
    );
  }
  await original.attach(new Uint8Array([1, 2, 3]), "PRIVATE ATTACHMENT");
  const bytes = await original.save();
  const task = getDocument({
    data: bytes.slice(),
    standardFontDataUrl: `${resolve("node_modules/pdfjs-dist/standard_fonts")}/`,
  });
  return { bytes, pdf: await task.promise, close: () => task.destroy() };
}

async function exported(searchable: boolean) {
  const { bytes, pdf, close } = await fixture();
  const harness = editor(searchable);
  harness.api.state.pdfBytes = bytes;
  harness.api.state.pdf = pdf;
  harness.api.state.pages = [0, 1].map(() =>
    harness.api.newPage(null, { widthPt: 300, heightPt: 200 }),
  );
  harness.api.state.pages[0].masks.push({
    type: "rect",
    x: 90,
    y: 170,
    width: 230,
    height: 50,
    effect: "solid",
    color: "#000000",
  });
  try {
    const output = new Uint8Array(
      await (await harness.api.buildRedactedPdf(() => {})).arrayBuffer(),
    );
    return { ...harness, output, originalBytes: bytes };
  } finally {
    await close();
  }
}

async function text(pdf: PDFDocumentProxy, page: number) {
  return (await (await pdf.getPage(page)).getTextContent()).items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ");
}

test("actual PDF export removes masked text and annotations while preserving untouched pages and source", async () => {
  const { output, originalBytes } = await exported(false);
  const task = getDocument({
    data: output.slice(),
    standardFontDataUrl: `${resolve("node_modules/pdfjs-dist/standard_fonts")}/`,
  });
  const pdf = await task.promise;
  try {
    assert.equal(pdf.numPages, 2);
    assert.equal(await text(pdf, 1), "");
    assert.match(await text(pdf, 2), /UNTOUCHED PAGE/);
    for (const index of [1, 2])
      assert.deepEqual(await (await pdf.getPage(index)).getAnnotations(), []);
    assert.equal(await pdf.getAttachments(), null);
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 150 / 72 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    await page.render({ canvas: canvas as never, viewport }).promise;
    assert.deepEqual(
      [...canvas.getContext("2d").getImageData(140, 190, 1, 1).data],
      [0, 0, 0, 255],
    );
    const saved = await PDFLib.PDFDocument.load(output);
    assert.equal(saved.getTitle(), undefined);
    const unchanged = await PDFLib.PDFDocument.load(originalBytes);
    assert.equal(unchanged.getTitle(), "PRIVATE METADATA");
    assert.ok(unchanged.getPage(0).node.has(PDFLib.PDFName.of("Annots")));
  } finally {
    await task.destroy();
  }
});

test("searchable PDF includes safe OCR words but excludes masked and touching words", async () => {
  const { output, terminated } = await exported(true);
  const task = getDocument({
    data: output.slice(),
    standardFontDataUrl: `${resolve("node_modules/pdfjs-dist/standard_fonts")}/`,
  });
  const pdf = await task.promise;
  try {
    const searchable = await text(pdf, 1);
    assert.match(searchable, /PUBLIC42/);
    assert.doesNotMatch(searchable, /SECRET42|TOUCHING/);
    assert.match(await text(pdf, 2), /UNTOUCHED PAGE/);
    assert.equal(terminated(), 1);
  } finally {
    await task.destroy();
  }
});

test("PDF page cache bounds retained canvases, serializes navigation and reloads evicted pages", async () => {
  const { api } = editor();
  let concurrent = 0;
  let peak = 0;
  let renders = 0;
  let cleaned = 0;
  api.state.pages = Array.from({ length: 8 }, () => api.newPage(null));
  api.state.pdf = {
    getPage: async () => ({
      getViewport: () => ({ width: 300, height: 200 }),
      render: () => ({
        promise: (async () => {
          concurrent++;
          peak = Math.max(peak, concurrent);
          renders++;
          await new Promise(setImmediate);
          concurrent--;
        })(),
      }),
      cleanup: () => {
        cleaned++;
      },
    }),
  };
  api.state.pageIndex = 7;
  await Promise.all(api.state.pages.map((_, index) => api.pageSource(index)));
  assert.equal(peak, 1);
  assert.equal(api.state.pages.filter((page) => page.source).length, 2);
  assert.ok(api.state.pages.every((page) => !page.sourcePromise));
  assert.equal(cleaned, 8);
  assert.equal(api.state.pages[0].source, null);
  api.state.pageIndex = 0;
  await api.pageSource(0);
  assert.equal(renders, 9);
  assert.ok(api.state.pages[0].source);
  assert.equal(api.state.pages.filter((page) => page.source).length, 2);
});

test("freeform validation uses actual nonzero fill and rejects empty masks before adding history", () => {
  const { api } = editor();
  api.state.pages = [api.newPage(createCanvas(100, 100))];
  const mask = (points: number[][], closed = true) => ({
    type: "path",
    closed,
    width: 10,
    effect: "solid",
    color: "#000000",
    points: points.map(([x, y]) => ({ x, y })),
  });
  for (const points of [
    [
      [10, 10],
      [50, 50],
    ],
    [
      [10, 10],
      [30, 30],
      [50, 50],
    ],
    [
      [10, 10],
      [50, 50],
      [10, 10],
      [50, 50],
    ],
    [
      [10, 10],
      [50, 10],
      [30, 50],
      [50, 10],
      [10, 10],
    ],
  ]) {
    assert.equal(api.addMask(mask(points)), false);
    assert.equal(api.state.pages[0].masks.length, 0);
  }
  assert.equal(
    api.validDraft(
      mask([
        [10, 10],
        [50, 10],
        [30, 50],
      ]),
    ),
    true,
  );
  assert.equal(
    api.validDraft(
      mask([
        [10, 10],
        [50, 50],
        [10, 50],
        [50, 10],
      ]),
    ),
    true,
  );
  assert.equal(
    api.validDraft(
      mask(
        [
          [10, 10],
          [50, 50],
        ],
        false,
      ),
    ),
    true,
  );
});
