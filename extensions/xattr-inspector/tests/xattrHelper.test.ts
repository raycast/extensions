import test from "node:test";
import assert from "node:assert/strict";
import {
  convertBinaryPlistFromBuffer,
  convertBinaryPlistJsonFromBuffer,
  detectAttributeKind,
  normalizeHexInput,
  parseMACLRecords,
  parseStringListInput,
  parseUserTagsInput,
  plistXmlToJson,
  stringArrayToBinaryPlist,
  summarizePlistJson,
  xattrHexOutputToBuffer,
} from "../src/utils/xattrHelper";

test("normalizeHexInput accepts whitespace and returns exact bytes", () => {
  assert.deepEqual([...normalizeHexInput("00 ff 10")], [0x00, 0xff, 0x10]);
  assert.deepEqual([...normalizeHexInput("00ff10")], [0x00, 0xff, 0x10]);
});

test("normalizeHexInput rejects invalid or odd-length hex", () => {
  assert.throws(() => normalizeHexInput("0x00"), /0-9 and A-F/);
  assert.throws(() => normalizeHexInput("abc"), /even number/);
});

test("xattrHexOutputToBuffer decodes xattr -px output with line breaks", () => {
  const buffer = xattrHexOutputToBuffer("62 70 6C 69 73 74 30 30\n00 FF");

  assert.deepEqual([...buffer], [0x62, 0x70, 0x6c, 0x69, 0x73, 0x74, 0x30, 0x30, 0x00, 0xff]);
});

test("parseMACLRecords decodes header and UUID records with zero padding", () => {
  const buffer = Buffer.from(
    "08404ee9be2f44044c4798ef54c1d73a42ad08400d641fb0586943ae947e2a9d4f2147de000000000000000000000000000000000000000000000000000000000000000000",
    "hex",
  );

  assert.deepEqual(parseMACLRecords(buffer), [
    {
      header: "0840",
      appUUID: "4EE9BE2F-4404-4C47-98EF-54C1D73A42AD",
    },
    {
      header: "0840",
      appUUID: "0D641FB0-5869-43AE-947E-2A9D4F2147DE",
    },
  ]);
});

test("parseStringListInput accepts comma and newline separated values", () => {
  assert.deepEqual(parseStringListInput("https://a.example\nhttps://b.example, https://c.example"), [
    "https://a.example",
    "https://b.example",
    "https://c.example",
  ]);
});

test("parseUserTagsInput preserves explicit color suffix and defaults plain tags to color 0", () => {
  assert.deepEqual(parseUserTagsInput("Work\nBlue\\n6"), ["Work\n0", "Blue\n6"]);
});

test("detectAttributeKind treats non-text bytes as binary hex", async () => {
  const rawBuffer = Buffer.from([0xff, 0x00, 0x10]);
  const result = await detectAttributeKind("com.example.binary", rawBuffer.toString("utf8"), "/tmp/example", rawBuffer);

  assert.equal(result.kind, "binary");
  assert.equal(result.editValue, "ff 00 10");
});

test("convertBinaryPlistFromBuffer converts binary plist buffers to XML", async () => {
  const buffer = await stringArrayToBinaryPlist(["https://example.com"]);
  const xml = await convertBinaryPlistFromBuffer(buffer);

  assert.ok(xml);
  assert.match(xml, /<array>/);
  assert.match(xml, /<string>https:\/\/example\.com<\/string>/);
});

test("convertBinaryPlistJsonFromBuffer converts binary plist buffers to pretty JSON", async () => {
  const buffer = await stringArrayToBinaryPlist(["https://example.com"]);
  const json = await convertBinaryPlistJsonFromBuffer(buffer);

  assert.ok(json);
  assert.match(json, /\[\n  "https:\/\/example\.com"\n\]/);
});

test("summarizePlistJson detects root type and NSKeyedArchiver metadata", () => {
  const summary = summarizePlistJson(
    JSON.stringify({
      $archiver: "NSKeyedArchiver",
      $objects: [],
      $top: {},
      $version: 100000,
    }),
  );

  assert.deepEqual(summary, {
    rootType: "Dictionary",
    archiveType: "NSKeyedArchiver",
    topLevelKeys: ["$archiver", "$objects", "$top", "$version"],
  });
});

test("plistXmlToJson converts CF$UID dictionaries from NSKeyedArchiver XML", () => {
  const json = plistXmlToJson(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>$archiver</key>
  <string>NSKeyedArchiver</string>
  <key>$objects</key>
  <array>
    <string>$null</string>
    <dict>
      <key>CF$UID</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>$top</key>
  <dict>
    <key>root</key>
    <dict>
      <key>CF$UID</key>
      <integer>1</integer>
    </dict>
  </dict>
</dict>
</plist>`);

  assert.deepEqual(JSON.parse(json), {
    $archiver: "NSKeyedArchiver",
    $objects: ["$null", { CF$UID: 1 }],
    $top: { root: { CF$UID: 1 } },
  });
});

test("detectAttributeKind includes JSON and summary for binary plist buffers", async () => {
  const buffer = await stringArrayToBinaryPlist(["https://example.com"]);
  const result = await detectAttributeKind("com.example.plist", buffer.toString("utf8"), "/tmp/example", buffer);

  assert.equal(result.kind, "binaryPlist");
  assert.match(result.plistJson ?? "", /https:\/\/example\.com/);
  assert.equal(result.plistSummary?.rootType, "Array");
});
