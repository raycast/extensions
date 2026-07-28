import { runAppleScript } from "@raycast/utils";

export interface Measurement {
  bounds: { x1: number; y1: number; x2: number; y2: number };
  inner: { w: number; h: number };
  dpr: number;
  avail: { w: number; h: number; left: number; top: number };
}

export const SETUP_HINT =
  'Enable Chrome → View → Developer → "Allow JavaScript from Apple Events" (restart Chrome if just toggled), then retry';

const INTERNAL_PAGE = /^(chrome|chrome-extension|about|devtools):/;

// No string literals inside the JS payload — it is embedded in an AppleScript string.
const MEASURE_JS =
  "JSON.stringify({iw:window.innerWidth,ih:window.innerHeight,dpr:window.devicePixelRatio," +
  "aw:screen.availWidth,ah:screen.availHeight,al:screen.availLeft||0,at:screen.availTop||0})";

const MEASURE_SCRIPT = `
tell application "Google Chrome"
	if (count of windows) is 0 then return "ERR:NO_WINDOW"
	set theURL to ""
	try
		set theURL to URL of active tab of front window
	end try
	set b to bounds of front window
	set bs to ((item 1 of b) as text) & "," & ((item 2 of b) as text) & "," & ((item 3 of b) as text) & "," & ((item 4 of b) as text)
	set js to missing value
	try
		set js to execute active tab of front window javascript "${MEASURE_JS}"
	on error errMsg
		return "ERR:JS:" & theURL & " ::: " & errMsg
	end try
	if js is missing value then return "ERR:JSNULL:" & theURL
	return bs & "|" & (js as text)
end tell`;

export async function measure(): Promise<Measurement> {
  const out = (await runAppleScript(MEASURE_SCRIPT)).trim();

  if (out === "ERR:NO_WINDOW") throw new Error("No Chrome window open");
  if (out.startsWith("ERR:JS")) {
    const detail = out.replace(/^ERR:JS(NULL)?:/, "");
    const url = detail.split(" ::: ")[0].trim();
    if (INTERNAL_PAGE.test(url) || url === "") {
      throw new Error(
        `Active tab is an internal Chrome page (${url || "new tab"}) — JS can't run there. Focus a regular website tab and retry.`,
      );
    }
    const chromeMsg = detail.split(" ::: ")[1]?.trim() ?? "";
    if (chromeMsg.includes("turned off") || out.startsWith("ERR:JSNULL"))
      throw new Error(SETUP_HINT);
    throw new Error(chromeMsg || SETUP_HINT);
  }

  const [boundsStr, json] = out.split("|");
  const [x1, y1, x2, y2] = boundsStr.split(",").map(Number);
  const d = JSON.parse(json);
  if ([x1, y1, x2, y2, d.iw, d.ih].some((n) => !Number.isFinite(n))) {
    throw new Error(`Could not parse Chrome measurement: ${out}`);
  }
  return {
    bounds: { x1, y1, x2, y2 },
    inner: { w: d.iw, h: d.ih },
    dpr: d.dpr,
    avail: { w: d.aw, h: d.ah, left: d.al, top: d.at },
  };
}

export async function setBounds(x1: number, y1: number, x2: number, y2: number): Promise<void> {
  const coords = [x1, y1, x2, y2].map(Math.round).join(", ");
  await runAppleScript(
    `tell application "Google Chrome" to set bounds of front window to {${coords}}`,
  );
}
