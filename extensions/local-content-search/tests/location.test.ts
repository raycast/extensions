import { strict as assert } from "node:assert";
import { test } from "node:test";
import { location } from "../src/location";

// The native wire value is page_image, not Swift's case identifier pageImage.
test("scanned and text PDF locations both label their page", () => {
  assert.equal(
    location({ kind: "pdf", segment: "page_image", loc: 3 }),
    "Page 3",
  );
  assert.equal(location({ kind: "pdf", segment: "page", loc: 2 }), "Page 2");
  assert.equal(location({ kind: "audio", segment: "audio", loc: 65 }), "1:05");
});
