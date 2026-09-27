import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { component, decodeBuffer, field, formatTimestamp, parseHL7, unescape } from "../src/hl7";
import { material, messageMarkdown, messageSummary, patientOf, segmentMarkdown } from "../src/render";

const fixture = (name: string) => decodeBuffer(readFileSync(join(__dirname, "fixtures", name)));

describe("parseHL7", () => {
  it("numbers MSH fields from the field separator", () => {
    const [msg] = parseHL7("MSH|^~\\&|APP|FAC|RCV|RFAC|20260101||ORU^R01|42|P|2.5");
    const msh = msg.segments[0];
    expect(component(msh, 1)).toBe("|");
    expect(component(msh, 2)).toBe("^~\\&");
    expect(component(msh, 3)).toBe("APP");
    expect(component(msh, 9, 2)).toBe("R01");
    expect(component(msh, 10)).toBe("42");
  });

  it("handles CR, LF, CRLF and blank lines", () => {
    const [msg] = parseHL7(fixture("oru.hl7"));
    expect(msg.segments.map((s) => s.name)).toEqual(["MSH", "PID", "ORC", "OBR", "OBX", "NTE", "NTE"]);
  });

  it("decodes UTF-8 umlauts", () => {
    const [msg] = parseHL7(fixture("orm.hl7"));
    const obr = msg.segments.find((s) => s.name === "OBR" && component(s, 1) === "2");
    expect(component(obr, 4, 2)).toBe("Fettsäuren der Erythrozytenmembran");
  });

  it("falls back to Windows-1252 for invalid UTF-8", () => {
    const text = decodeBuffer(Uint8Array.from([0x4d, 0x53, 0x48, 0x7c, 0xe4]));
    expect(text).toBe("MSH|ä");
  });

  it("splits repetitions, components and subcomponents", () => {
    const [msg] = parseHL7("MSH|^~\\&\rOBR|1||||||||||||||SEGN&&&03^Serum-B~X");
    const f = field(msg.segments[1], 15)!;
    expect(f.repetitions).toEqual([[["SEGN", "", "", "03"], ["Serum-B"]], [["X"]]]);
  });

  it("starts a new message at every MSH", () => {
    const msgs = parseHL7("MSH|^~\\&|A\rPID|1\nMSH|^~\\&|B\nPID|2");
    expect(msgs).toHaveLength(2);
    expect(component(msgs[1].segments[1], 1)).toBe("2");
  });

  it("leaves batch headers and trailers out of the messages", () => {
    const msgs = parseHL7("FHS|^~\\&|A\rBHS|^~\\&|A\rMSH|^~\\&|A\rPID|1\rMSH|^~\\&|B\rPID|2\rBTS|2\rFTS|1");
    expect(msgs.map((m) => m.segments.map((s) => s.name))).toEqual([
      ["MSH", "PID"],
      ["MSH", "PID"],
    ]);
  });

  it("uses custom delimiters", () => {
    const [msg] = parseHL7("MSH#*~\\&#APP\rPID#1##ID*X");
    expect(component(msg.segments[1], 3, 2)).toBe("X");
  });
});

describe("unescape", () => {
  const d = { field: "|", component: "^", repetition: "~", escape: "\\", subcomponent: "&" };
  it("resolves delimiter, line break and hex escapes", () => {
    expect(unescape("a\\F\\b\\S\\c\\T\\d\\R\\e\\E\\", d)).toBe("a|b^c&d~e\\");
    expect(unescape("x\\.br\\y", d)).toBe("x\ny");
    expect(unescape("\\X41\\", d)).toBe("A");
    expect(unescape("caf\\XC3A9\\", d)).toBe("café");
  });
});

describe("render", () => {
  it("formats timestamps", () => {
    expect(formatTimestamp("20260714120000.000")).toBe("2026-07-14 12:00:00");
    expect(formatTimestamp("20000101")).toBe("2000-01-01");
    expect(formatTimestamp("abc")).toBeUndefined();
  });

  it("puts each result under its order, with its notes", () => {
    const [msg] = parseHL7(fixture("oru.hl7"));
    const md = messageMarkdown(msg);
    expect(md).toContain("# ORU^R01");
    expect(md).toContain("## Results");
    expect(md).toContain("### 1. MELA");
    expect(md).toContain("- **Melatonin (RIA) (MELA)** · 25 pg/ml");
    expect(md).toContain("    - Reference range: day: < 30 pg/ml".replace(/</g, "\\<"));
  });

  it("flags abnormal results", () => {
    const [msg] = parseHL7(fixture("oru-no-material.hl7"));
    expect(messageMarkdown(msg)).toContain("**5.67 mU/L** ⚠︎ H – Above high normal · range 0.55 - 4.80");
  });

  it("does not flag a result marked N (normal)", () => {
    const [msg] = parseHL7("MSH|^~\\&\rOBR|1\rOBX|1|NM|HDL^HDL||58|mg/dL|>45|N|||F");
    expect(messageMarkdown(msg)).toContain("- **HDL** · 58 mg/dL · range \\>45");
  });

  it("keeps patient notes and notes of a new order in place", () => {
    const [msg] = parseHL7(
      "MSH|^~\\&\rPID|1\rNTE|1||Patient note\rORC|NW\rOBR|1|||A^Test A\rOBX|1|NM|A^Test A||1\rORC|NW\rNTE|1||Order B note\rOBR|2|||B^Test B",
    );
    const md = messageMarkdown(msg, { showSegments: false });
    expect(md.indexOf("> Patient note")).toBeLessThan(md.indexOf("## Results"));
    expect(md.indexOf("### 2. Test B (B)")).toBeGreaterThan(-1);
    expect(md.indexOf("Order B note")).toBeGreaterThan(md.indexOf("### 2. Test B (B)"));
  });

  it("lists every segment unless hidden", () => {
    const [msg] = parseHL7(fixture("oru.hl7"));
    expect(messageMarkdown(msg)).toContain("## Segments (7)");
    expect(messageMarkdown(msg, { showSegments: false })).not.toContain("## Segments");
  });

  it("names fields and components", () => {
    const [msg] = parseHL7(fixture("orm.hl7"));
    const md = segmentMarkdown(msg.segments[1], false);
    expect(md).toContain("- `PID-5` **Patient Name:** MUSTERMANN^MAX");
    expect(md).toContain("    - `.1` Family Name: MUSTERMANN");
    expect(md).toContain("- `PID-7` **Date/Time of Birth:** 2000-01-01");
    expect(md).toContain("M – Male");
  });

  it("shows the material of each order from OBR-15", () => {
    const [msg] = parseHL7(fixture("orm-repeated-material.hl7"));
    expect(material(msg.segments.find((s) => s.name === "OBR"))).toBe("VB, LIHE, LIHE");
    const [serum] = parseHL7("MSH|^~\\&\rOBR|1||||||||||||||SEGN&&&03^Serum-B");
    expect(material(serum.segments[1])).toBe("SEGN (Serum-B)");
    const [standard] = parseHL7("MSH|^~\\&\rOBR|1||||||||||||||BLD&Whole blood&HL70070^HEP&Heparin");
    expect(material(standard.segments[1])).toBe("Whole blood");
  });

  it("keeps each order's SPM specimen with that order", () => {
    const [msg] = parseHL7(
      "MSH|^~\\&\rOBR|1|||A^Test A\rOBX|1|NM|A^Test A||1\rSPM|1|||SER^Serum^HL70487\rOBR|2|||B^Test B\rOBX|1|NM|B^Test B||2\rSPM|1|||UR^Urine^HL70487",
    );
    const md = messageMarkdown(msg, { showSegments: false });
    expect(md).toContain("### 1. Test A (A)\nMaterial: Serum (SER)\n");
    expect(md).toContain("### 2. Test B (B)\nMaterial: Urine (UR)\n");
    expect(md).not.toContain("Serum, Urine");
  });

  it("says when a message carries no material", () => {
    const [msg] = parseHL7(fixture("oru-no-material.hl7"));
    expect(messageMarkdown(msg)).toContain("No material in this message");
    expect(messageMarkdown(msg)).toContain("received 2026-09-22");
  });

  it("reads UTF-8 despite MSH-18 8859/1", () => {
    const [msg] = parseHL7(fixture("oru-no-material.hl7"));
    expect(messageMarkdown(msg)).toContain("Östradiol 17-ß");
  });

  it("reads the patient and a summary for past views", () => {
    const [msg] = parseHL7(fixture("oru-no-material.hl7"));
    expect(patientOf(msg)).toEqual({ name: "Max Muster", id: "900000005", born: "1980-01-01" });
    expect(messageSummary(msg)).toBe("ORU^R01 · 4 results");
  });
});
