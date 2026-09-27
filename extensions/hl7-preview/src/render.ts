import { COMPONENTS, SEGMENT_NAMES, TABLES, fieldDef } from "./definitions";
import { Field, Message, Segment, component, field, formatTimestamp, isEmpty } from "./hl7";

const TIME_TYPES = new Set(["TS", "DTM", "DT"]);

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function first(segments: Segment[], name: string): Segment | undefined {
  return segments.find((s) => s.name === name);
}

/** "Text (CODE)" for a coded element, or whichever part exists. */
function coded(segment: Segment | undefined, position: number): string {
  const code = clean(component(segment, position, 1));
  const text = clean(component(segment, position, 2));
  if (code && text && code !== text) return `${text} (${code})`;
  return text || code;
}

function lookup(segment: string, position: number, value: string): string | undefined {
  return TABLES[`${segment}-${position}`]?.[value];
}

function withMeaning(segment: string, position: number, value: string): string {
  const meaning = lookup(segment, position, value);
  return meaning ? `${value} – ${meaning}` : value;
}

function personName(segment: Segment | undefined, position: number, offset = 0): string {
  const family = component(segment, position, 1 + offset);
  const given = component(segment, position, 2 + offset);
  return clean([given, family].filter(Boolean).join(" "));
}

function timestamp(value: string): string {
  return formatTimestamp(value) ?? value;
}

/** Joins every repetition of a field into readable text. */
function readable(f: Field | undefined): string {
  if (!f) return "";
  return f.repetitions
    .map((rep) =>
      clean(
        rep
          .map((comp) => comp.join(" & "))
          .filter(Boolean)
          .join(" "),
      ),
    )
    .filter(Boolean)
    .join(", ");
}

export function segmentName(segment: Segment): string {
  return SEGMENT_NAMES[segment.name] ?? (segment.name.startsWith("Z") ? "Custom (Z-segment)" : "Unknown segment");
}

/** Escapes inline Markdown so values render as typed. */
function text(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([*_`<>[\]#|])/g, "\\$1")
    .replace(/\r?\n/g, "  \n")
    .replace(/^([-+])/, "\\$1");
}

/** Every field of a segment with its name and named components, as a nested list. */
export function segmentMarkdown(s: Segment, showEmpty: boolean): string {
  const out: string[] = [`### ${s.name} · ${segmentName(s)}`, ""];

  for (const f of s.fields) {
    if (!showEmpty && isEmpty(f)) continue;
    const { name = "", type = "" } = fieldDef(s.name, f.position);
    const id = `${s.name}-${f.position}`;
    const reps = f.repetitions;

    reps.forEach((rep, r) => {
      const label = reps.length > 1 ? `${id} [${r + 1}]` : id;
      const title = name ? `**${text(name)}:** ` : "";
      const single = rep.length === 1 && rep[0].length === 1;

      if (single) {
        const raw = rep[0][0];
        let value = TIME_TYPES.has(type) ? timestamp(raw) : raw;
        const meaning = lookup(s.name, f.position, raw);
        if (meaning) value = `${raw} – ${meaning}`;
        out.push(`- \`${label}\` ${title}${value.trim() ? text(value) : "_empty_"}`);
        return;
      }

      out.push(`- \`${label}\` ${title}${text(rep.map((c) => c.join("&")).join("^"))}`);
      const names = COMPONENTS[type] ?? [];
      rep.forEach((comp, c) => {
        const value = comp.join(" & ");
        if (!showEmpty && value.trim() === "") return;
        const compName = names[c];
        const shown = compName === "Time" ? timestamp(value) : value;
        out.push(`    - \`.${c + 1}\` ${compName ? `${text(compName)}: ` : ""}${text(shown)}`);
      });
    });
  }

  return out.join("\n");
}

export function messageType(m: Message): string {
  const msh = first(m.segments, "MSH");
  return [component(msh, 9, 1), component(msh, 9, 2)].filter(Boolean).join("^") || m.segments[0]?.name || "HL7";
}

/** Type and number of results or orders, e.g. "ORU^R01 · 4 results". */
export function messageSummary(m: Message): string {
  const results = m.segments.filter((s) => s.name === "OBX").length;
  const orders = m.segments.filter((s) => s.name === "OBR").length;
  const count = results
    ? `${results} result${results === 1 ? "" : "s"}`
    : orders
      ? `${orders} order${orders === 1 ? "" : "s"}`
      : "";
  return [messageType(m), count].filter(Boolean).join(" · ");
}

/** The patient of a message: name, ID and date of birth, as far as PID carries them. */
export function patientOf(m: Message): { name: string; id: string; born: string } {
  const pid = first(m.segments, "PID");
  const dob = component(pid, 7);
  return {
    name: personName(pid, 5),
    id: component(pid, 3) || component(pid, 2),
    born: dob ? timestamp(dob) : "",
  };
}

/**
 * Material of an order: OBR-15 (v2.3–2.5), else the message's SPM-4 specimen types (v2.5+).
 * OBR-15.1 is the specimen as code&text, OBR-15.2 the additives. The text of .1 wins. Without it,
 * the code shows with .2 in brackets: some labs (IMD) put the material text there, e.g.
 * `SEGN&&&03^Serum-B` reads "SEGN (Serum-B)".
 */
export function material(obr: Segment | undefined, m: Message): string {
  const fromObr = (field(obr, 15)?.repetitions ?? [])
    .map((rep) => {
      const [code = "", text = ""] = (rep[0] ?? []).map(clean);
      const second = clean(rep[1]?.join(" ") ?? "");
      if (text) return text;
      return second ? `${code} (${second})`.trim() : code;
    })
    .filter(Boolean);
  if (fromObr.length) return fromObr.join(", ");
  return m.segments
    .filter((s) => s.name === "SPM")
    .map((spm) => coded(spm, 4))
    .filter(Boolean)
    .join(", ");
}

interface Result {
  obx: Segment;
  notes: string[];
}

interface Order {
  obr?: Segment;
  /** NTE lines between the OBR and its first OBX. */
  notes: string[];
  results: Result[];
}

/**
 * OBR segments with their OBX results, each with the NTE lines that follow it.
 * NTE lines before the first ORC or OBR belong to the message (e.g. patient notes). NTE lines after
 * an ORC and before its OBR belong to that next order, not to the previous result.
 */
function collectOrders(segments: Segment[]): { general: string[]; orders: Order[] } {
  const general: string[] = [];
  const orders: Order[] = [];
  let order: Order | undefined;
  let result: Result | undefined;
  let pending: string[] = [];
  let inOrders = false;
  for (const s of segments) {
    if (s.name === "ORC") {
      inOrders = true;
      order = undefined;
      result = undefined;
    } else if (s.name === "OBR") {
      inOrders = true;
      order = { obr: s, notes: pending, results: [] };
      pending = [];
      orders.push(order);
      result = undefined;
    } else if (s.name === "OBX") {
      if (!order) {
        order = { notes: [], results: [] };
        orders.push(order);
      }
      result = { obx: s, notes: [] };
      order.results.push(result);
    } else if (s.name === "NTE") {
      const note = readable(field(s, 3));
      if (result ?? order) (result ?? order)!.notes.push(note);
      else if (inOrders) pending.push(note);
      else general.push(note);
    }
  }
  return { general: [...general, ...pending], orders };
}

function resultLine({ obx, notes }: Result): string[] {
  // "N" is the normal flag; only other flags mark a result as abnormal.
  const flag = component(obx, 8) === "N" ? "" : component(obx, 8);
  const value = text([readable(field(obx, 5)), component(obx, 6)].filter(Boolean).join(" "));
  const status = component(obx, 11);
  const parts = [
    `**${text(coded(obx, 3))}**`,
    flag ? `**${value}** ⚠︎ ${text(withMeaning("OBX", 8, flag))}` : value,
    component(obx, 7) && `range ${text(component(obx, 7))}`,
    status && status !== "F" && text(withMeaning("OBX", 11, status)),
  ].filter(Boolean);
  return [`- ${parts.join(" · ")}`, ...notes.map((n) => `    - ${text(n)}`)];
}

/**
 * One message as a document: header, patient, orders with their results and notes, then every
 * segment with named fields. It is read top to bottom in a single scrolling view.
 */
export function messageMarkdown(m: Message, options: { showEmpty?: boolean; showSegments?: boolean } = {}): string {
  const { showEmpty = false, showSegments = true } = options;
  const msh = first(m.segments, "MSH");
  const pid = first(m.segments, "PID");
  const out: string[] = [`# ${messageType(m)}`, ""];

  if (msh) {
    const app = (p: number) => {
      const [a, f] = [component(msh, p), component(msh, p + 1)];
      return f && f !== a ? `${a} @ ${f}` : a;
    };
    const route = [app(3), app(5)].filter(Boolean).join(" → ");
    const sent = component(msh, 7);
    const facts = [
      sent && `Sent ${timestamp(sent)}`,
      component(msh, 10) && `Control ID ${component(msh, 10)}`,
      withMeaning("MSH", 11, component(msh, 11)),
      component(msh, 12) && `HL7 ${component(msh, 12)}`,
      component(msh, 18),
    ].filter(Boolean);
    if (route) out.push(`**${text(route)}**  `);
    out.push(text(facts.join(" · ")), "");
  }

  if (pid) {
    const dob = component(pid, 7);
    const id = component(pid, 3) || component(pid, 2);
    const facts = [
      `**${text(personName(pid, 5) || "Unnamed patient")}**`,
      dob && `born ${timestamp(dob)}`,
      component(pid, 8) && text(withMeaning("PID", 8, component(pid, 8))),
      id && `ID ${text(id)}`,
    ].filter(Boolean);
    out.push(facts.join(" · "), "");
  }

  const { general, orders } = collectOrders(m.segments);
  if (general.length) out.push(...general.map((n) => `> ${text(n)}\n`), "");
  if (orders.length) {
    const hasResults = orders.some((o) => o.results.length);
    out.push("---", "", `## ${hasResults ? "Results" : "Orders"}`, "");
    if (orders.some((o) => o.obr) && !orders.some((o) => material(o.obr, m))) {
      out.push("> No material in this message: OBR-15 is empty and there is no SPM segment.", "");
    }
    orders.forEach((order, i) => {
      const { obr } = order;
      const title = obr ? coded(obr, 4) : "Results without an order";
      out.push(`### ${obr ? `${component(obr, 1) || i + 1}. ` : ""}${text(title)}`);
      if (obr) {
        const received = component(obr, 14);
        const observed = component(obr, 7);
        const status = component(obr, 25);
        const facts = [
          material(obr, m) && `Material: ${material(obr, m)}`,
          received && `received ${timestamp(received)}`,
          !received && observed && `observed ${timestamp(observed)}`,
          status && withMeaning("OBR", 25, status),
        ].filter(Boolean);
        if (facts.length) out.push(text(facts.join(" · ")));
      }
      out.push("", ...order.notes.map((n) => `> ${text(n)}\n`));
      order.results.forEach((r) => out.push(...resultLine(r)));
      out.push("");
    });
  }

  if (showSegments) {
    out.push("---", "", `## Segments (${m.segments.length})`, "");
    for (const s of m.segments) out.push(segmentMarkdown(s, showEmpty), "");
  }

  return out.join("\n");
}
