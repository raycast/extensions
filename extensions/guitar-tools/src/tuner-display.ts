import { frequencyToNote } from "./detector";

export type DisplayState = "listening" | "warming" | "paused" | "loading" | "error";
export interface DisplayInput {
  pitch: number | null;
  db: number;
  peak: number;
  device: string;
  state: DisplayState;
  dark: boolean;
}

export const GAUGE_CENTER = 154;
export const GAUGE_SCALE = 2;
export const IN_TUNE_CENTS = 3;

export function centsToY(cents: number): number {
  return GAUGE_CENTER - Math.max(-50, Math.min(50, cents)) * GAUGE_SCALE;
}

function escapeXML(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
}

export function displayModel(input: DisplayInput) {
  const active = input.state === "listening";
  const note =
    active && input.pitch && Number.isFinite(input.pitch) && input.pitch > 0 ? frequencyToNote(input.pitch) : null;
  const inTune = note !== null && Math.abs(note.cents) <= IN_TUNE_CENTS;
  const status =
    input.state === "error"
      ? "Audio capture stopped"
      : input.state === "paused"
        ? "Listening paused"
        : input.state === "loading"
          ? "Loading audio input…"
          : input.state === "warming"
            ? "Stabilizing audio input…"
            : note
              ? inTune
                ? "In tune · hold this position"
                : note.cents > 0
                  ? "Sharp · loosen the string"
                  : "Flat · tighten the string"
              : input.db > -65
                ? "Signal received · play one string"
                : "Play an open string";
  return { note, inTune, status, cursorY: note ? centsToY(note.cents) : null };
}

/** In-memory SVG: no file churn and no changes to the capture or pitch detector. */
export function renderTunerSVG(input: DisplayInput): string {
  const { note, inTune, status, cursorY } = displayModel(input);
  const fg = input.dark ? "#f5f5f7" : "#17191d";
  const muted = input.dark ? "#b4b6be" : "#60636c";
  const line = input.dark ? "#44464f" : "#cdd0d6";
  const track = input.dark ? "#30323a" : "#e6e8ec";
  const green = input.dark ? "#58e49c" : "#087847";
  const amber = input.dark ? "#ffc16e" : "#a45300";
  const red = input.dark ? "#ff8585" : "#bd3030";
  const color = note ? (inTune ? green : amber) : muted;
  const live = input.state === "listening" || input.state === "warming";
  const db = live && Number.isFinite(input.db) ? input.db : -100;
  const level = Math.max(0, Math.min(1, (db + 65) / 65));
  const clipped = live && input.peak > 0.98;
  const ticks = Array.from({ length: 11 }, (_, i) => 50 - i * 10)
    .map((cents) => {
      const y = centsToY(cents);
      const zero = cents === 0;
      return `<line x1="${zero ? 408 : 424}" y1="${y}" x2="490" y2="${y}" stroke="${zero ? green : line}" stroke-width="${zero ? 2 : 1}"/>
      <text x="506" y="${y + 5}" fill="${zero ? green : muted}" font-size="14">${cents > 0 ? "+" : ""}${cents}</text>`;
    })
    .join("");
  const cursor =
    cursorY === null
      ? ""
      : `<g id="pitch-cursor" data-cents="${note!.cents}">
    <path d="M393 ${cursorY - 8} L405 ${cursorY} L393 ${cursorY + 8} Z" fill="${color}"/>
    <rect x="412" y="${cursorY - 5}" width="78" height="10" rx="5" fill="${color}"/>
    <circle cx="451" cy="${cursorY}" r="3" fill="${input.dark ? "#17191d" : "#ffffff"}"/>
  </g>`;
  const device = Array.from(input.device || "System Default Input");
  const deviceLabel = device.length > 50 ? device.slice(0, 49).join("") + "…" : device.join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="330" viewBox="0 0 660 330">
  <title>${escapeXML(note ? `${note.name}${note.octave}, ${note.cents} cents. ${status}` : status)}</title>
  <g font-family="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif" style="font-variant-numeric:tabular-nums">
    <text x="32" y="28" fill="${muted}" font-size="12" font-weight="600" letter-spacing="2">DETECTED NOTE</text>
    <text x="28" y="121" fill="${fg}" font-size="100" font-weight="650" letter-spacing="-4">${note ? escapeXML(note.name) : "—"}<tspan font-size="42" letter-spacing="0">${note ? note.octave : ""}</tspan></text>
    <text x="33" y="152" fill="${muted}" font-size="19">${note ? `${input.pitch!.toFixed(1)} Hz` : "One string at a time"}</text>
    <text x="30" y="205" fill="${color}" font-size="43" font-weight="600">${note ? `${note.cents > 0 ? "+" : ""}${note.cents}` : "—"}<tspan font-size="18" font-weight="400"> cents</tspan></text>
    <text x="33" y="235" fill="${color}" font-size="17">${escapeXML(status)}</text>

    <text x="451" y="26" text-anchor="middle" fill="${muted}" font-size="12" font-weight="600" letter-spacing="1.5">SHARP</text>
    <rect x="438" y="54" width="26" height="200" rx="13" fill="${track}"/>
    <rect id="in-tune-zone" x="406" y="${centsToY(IN_TUNE_CENTS)}" width="88" height="${IN_TUNE_CENTS * GAUGE_SCALE * 2}" rx="5" fill="${green}" fill-opacity="0.2"/>
    ${ticks}
    <text x="550" y="${GAUGE_CENTER + 5}" fill="${green}" font-size="12" font-weight="600">IN TUNE</text>
    ${cursor}
    <text x="451" y="285" text-anchor="middle" fill="${muted}" font-size="12" font-weight="600" letter-spacing="1.5">FLAT</text>

    <text x="33" y="268" fill="${muted}" font-size="11" letter-spacing="1">INPUT LEVEL</text>
    <text x="304" y="268" text-anchor="end" fill="${clipped ? red : muted}" font-size="12">${clipped ? "CLIPPING" : db <= -99 ? "—" : `${Math.round(db)} dBFS`}</text>
    <rect x="33" y="279" width="271" height="7" rx="3.5" fill="${track}"/>
    <rect x="33" y="279" width="${(271 * level).toFixed(1)}" height="7" rx="3.5" fill="${clipped ? red : green}"/>
    <line x1="33" y1="302" x2="607" y2="302" stroke="${line}" stroke-width="1"/>
    <text x="33" y="324" fill="${muted}" font-size="12">${escapeXML(deviceLabel)}</text>
    <text x="607" y="324" text-anchor="end" fill="${muted}" font-size="12">A = 440 Hz</text>
  </g>
</svg>`;
}

export function tunerMarkdown(input: DisplayInput): string {
  const { status } = displayModel(input);
  const uri = Buffer.from(renderTunerSVG(input)).toString("base64");
  return `![${status}](data:image/svg+xml;base64,${uri}?raycast-width=660&raycast-height=330)`;
}
