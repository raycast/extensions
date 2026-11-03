import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlist } from "../src/digup/plist";

const HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`;

test("what `defaults export` prints is read: strings, arrays, booleans, numbers, dates", () => {
  const xml = `${HEADER}
<dict>
	<key>SULastCheckTime</key>
	<date>2026-10-12T08:54:11Z</date>
	<key>roots</key>
	<array>
		<string>/Users/sam/Documents/Tax &amp; Legal</string>
		<string>/Users/sam/照片</string>
	</array>
	<key>indexOnBattery</key>
	<true/>
	<key>indexHoursOn</key>
	<false/>
	<key>encoderIdleSeconds</key>
	<integer>600</integer>
	<key>ratio</key>
	<real>1.5</real>
	<key>codeEditor</key>
	<string></string>
	<key>nested</key>
	<dict>
		<key>a &lt; b</key>
		<array/>
	</dict>
</dict>
</plist>`;
  assert.deepEqual(parsePlist(xml), {
    SULastCheckTime: "2026-10-12T08:54:11Z",
    roots: ["/Users/sam/Documents/Tax & Legal", "/Users/sam/照片"],
    indexOnBattery: true,
    indexHoursOn: false,
    encoderIdleSeconds: 600,
    ratio: 1.5,
    codeEditor: "",
    nested: { "a < b": [] },
  });
});

test("a domain with nothing in it is an empty dictionary", () => {
  assert.deepEqual(parsePlist(`${HEADER}\n<dict/>\n</plist>`), {});
});

test("numeric character references and quotes are decoded", () => {
  assert.deepEqual(parsePlist(`${HEADER}<array><string>caf&#233; &quot;x&quot; &#x4E2D;</string></array></plist>`), [
    'café "x" 中',
  ]);
});

test("something that isn't a property list is undefined", () => {
  assert.equal(parsePlist(""), undefined);
  assert.equal(parsePlist("The domain does not exist"), undefined);
  assert.equal(parsePlist("<plist><dict><key>a</key></dict></plist>"), undefined);
});
