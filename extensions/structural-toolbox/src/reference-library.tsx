import { ViewActions, previewMarkdown } from "./ui/view-actions";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import {
  referenceCases,
  referenceEnvelope,
  ReferenceCase,
  RefInput,
  referenceSolution,
  referenceModel,
  referenceScales,
  referenceResult,
} from "./core/reference-cases";
import { parseQuick, quantity, pointLocation } from "./core/input";
import { formulaScalar } from "./core/formula-input";
import { formulaCatalog } from "./core/formula-catalog";
import { Library, fuzzyScore, usableMaterial, pendingDataNotice } from "./core/library";
import { Material, Section } from "./core/types";
import { smartChoices, preferredMaterial, choiceID } from "./core/smart-choices";
import { withShearProperties, energyShearArea } from "./core/deformation";
import { useLibrary, defaultMaterial, defaultSection, fmt } from "./ui/state";
import { equation } from "./ui/equations";
import { choiceRows } from "./ui/choices";
import { analysisDashboard, systemDrawing, temperatureDrawing } from "./ui/drawings";
import { LibraryError } from "./ui/common";
function coefficient(v: number) {
  if (Math.abs(v) < 1e-9) return "0";
  for (let d = 1; d <= 1536; d++) {
    const n = Math.round(v * d);
    if (Math.abs(v - n / d) < 1e-9) return d === 1 ? String(n) : `${n < 0 ? "-" : ""}\\frac{${Math.abs(n)}}{${d}}`;
  }
  return Number(v.toPrecision(5)).toString();
}
function referenceEquations(c: ReferenceCase, ratio: number) {
  if (c.envelope) {
    const e = referenceEnvelope(c);
    return (
      equation(`M_+=${coefficient(e.positive)}qL^2,\\quad M_-=${coefficient(e.negative)}qL^2`) +
      "\n\n" +
      equation(`|v_b|_{env}=${coefficient(e.deflection)}\\frac{qL^4}{EI}`) +
      "\n\n" +
      e.reactions
        .map((r) =>
          equation(`R_{${r.node},min}=${coefficient(r.min)}qL,\\quad R_{${r.node},max}=${coefficient(r.max)}qL`),
        )
        .join("\n\n") +
      `\n\nEnvelope over ${e.patterns} patterns. Min/max values are not concurrent. Each span is either fully loaded by q or unloaded.`
    );
  }

  const s = referenceSolution(c, ratio),
    power =
      c.kind === "udl"
        ? "qL^4"
        : c.kind === "moment"
          ? "ML^2"
          : c.kind === "thermal"
            ? "\\alpha\\Delta T L^2/h"
            : "PL^3";
  const moment =
    c.kind === "udl" ? "qL^2" : c.kind === "moment" ? "M" : c.kind === "thermal" ? "EI\\alpha\\Delta T/h" : "PL";
  const rotation =
    c.kind === "udl" ? "qL^3" : c.kind === "moment" ? "ML" : c.kind === "thermal" ? "\\alpha\\Delta T L/h" : "PL^2";
  const rotations = s.supports
    .map((p) => ({ x: p.x, value: s.at(p.x).rotation }))
    .filter((p) => Math.abs(p.value) > 1e-9)
    .map((p) =>
      equation(
        `\\theta_{${String.fromCharCode(65 + p.x)}}=${coefficient(p.value)}\\,${c.kind === "thermal" ? rotation : `\\frac{${rotation}}{EI}`}`,
      ),
    )
    .join("\n\n");
  const force =
    c.kind === "udl" ? "qL" : c.kind === "moment" ? "M/L" : c.kind === "thermal" ? "EI\\alpha\\Delta T/(hL)" : "P";
  return (
    equation(`M_{|max|}=${coefficient(s.peakM.value)}\\,${moment}`) +
    "\n\n" +
    equation(`v_{b,|max|}=${coefficient(s.peakVb.value)}\\,${c.kind === "thermal" ? power : `\\frac{${power}}{EI}`}`) +
    "\n\n" +
    equation(`|V|_{max}=${coefficient(Math.abs(s.peakV.value))}\\,${force}`) +
    "\n\n" +
    rotations +
    "\n\n" +
    s.reactions
      .filter((r) => Math.abs(r.value) > 1e-9)
      .map((r) =>
        equation(
          `${r.type === "force" ? "R" : "C"}_{${String.fromCharCode(65 + r.x)}}=${coefficient(r.value)}\\,${r.type === "force" ? force : moment}`,
        ),
      )
      .join("\n\n") +
    "\n\n" +
    equation(
      c.kind === "thermal"
        ? "v''=\\frac{M}{EI}-\\frac{\\alpha\\Delta T}{h}"
        : "EI\\,v''=M(x),\\quad V=M'(x),\\quad \\theta=v'(x)",
    )
  );
}
function example(c: ReferenceCase) {
  return c.kind === "thermal"
    ? "6m, dT=20, alpha=12e-6, 100x300"
    : `6m, ${c.kind === "udl" ? "3kN/m" : c.kind === "moment" ? "M=10kNm" : "10kN"}, C24, 100x300${c.variable ? ", at 40%" : ""}`;
}
function parseReference(
  query: string,
  c: ReferenceCase,
  lib: Library,
  initialMaterial: Material,
  initialSection: Section,
) {
  const quick = parseQuick(query, lib),
    material = quick.material || (quick.section ? preferredMaterial(quick.section, lib) : initialMaterial),
    section = quick.section || initialSection;
  const v: RefInput = {
    L: NaN,
    P: NaN,
    q: NaN,
    M: NaN,
    E: material.E ?? NaN,
    I: section.Iy,
    a: NaN,
    alpha: material.family === "Steel" ? 12e-6 : material.family === "Concrete" ? 10e-6 : 5e-6,
    dT: NaN,
    h: section.h,
    G: material.G || undefined,
    As: energyShearArea(section).value,
  };
  const errors: string[] = [];
  let ratio: number | undefined,
    slot = 0;
  const order = c.kind === "thermal" ? ["L", "dT"] : ["L", c.kind === "udl" ? "q" : c.kind === "moment" ? "M" : "P"];
  for (const token of query.split(",").map((s) => s.trim())) {
    if (!token) {
      continue;
    }
    try {
      const preset = parseQuick(token, lib);
      if (preset.section || preset.material) continue;
      if (/^at /i.test(token)) {
        const loc = pointLocation(token.slice(3));
        if (loc.ratio !== undefined) ratio = loc.ratio;
        else v.a = (loc.position ?? NaN) * 1000;
        continue;
      }
      const named = token.match(/^(alpha|dT|deltaT|As|[LPEGIMqa]|span|udl)\s*=?\s*(.+)$/i);
      let key: string, raw: string;
      if (named) {
        key =
          (
            {
              span: "L",
              udl: "q",
              dt: "dT",
              deltat: "dT",
              alpha: "alpha",
              q: "q",
              a: "a",
              as: "As",
            } as Record<string, string>
          )[named[1].toLowerCase()] || named[1].toUpperCase();
        raw = named[2];
      } else if (/^[+-]?[\d.]/.test(token)) {
        const clean = token.toLowerCase().replace(/\s/g, "");
        const explicit = /k?n\/m$|n\/mm$/.test(clean)
          ? "q"
          : /k?n$/.test(clean)
            ? "P"
            : /k?n[·*]?m$/.test(clean)
              ? "M"
              : /(?:mm|cm|m)$/.test(clean)
                ? "L"
                : undefined;
        if (explicit) {
          key = explicit;
          raw = token;
        } else {
          while (slot < order.length && Number.isFinite(v[order[slot] as keyof RefInput])) slot++;
          key = order[slot++];
          raw = token;
          if (!key) throw Error("Use named inputs for additional values");
        }
      } else throw Error(`Choose a preset below or complete “${token}”`);
      if (key === "alpha" || key === "dT") {
        const number = Number(raw.replace(/\s*(?:\/k|k|°c|c)$/i, ""));
        if (!Number.isFinite(number)) throw Error(`Enter numeric ${key}`);
        (v as any)[key] = number;
      } else if (key === "G") v.G = quantity(raw, "modulus");
      else if (key === "As") v.As = quantity(raw, "area");
      else if (key === "I" || key === "E" || key === "L" || key === "a" || key === "P" || key === "M" || key === "q")
        (v as any)[key] = formulaScalar(formulaCatalog[0], key, raw);
      else throw Error(`Unsupported input ${key}`);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  if (v.G !== undefined && !(v.G > 0)) errors.push("G must be positive");
  if (v.As !== undefined && !(v.As > 0)) errors.push("As must be positive");
  if (ratio !== undefined) v.a = ratio * v.L;
  if (!Number.isFinite(v.a)) v.a = v.L / 2;
  return { v, material, section, errors, quick };
}
function ReferenceCalculator({
  c,
  library,
  initialMaterial,
  initialSection,
}: {
  c: ReferenceCase;
  library: Library;
  initialMaterial: Material;
  initialSection: Section;
}) {
  const [query, setQuery] = useState(""),
    [selection, setSelection] = useState("auto");
  const parsed = parseReference(query, c, library, initialMaterial, initialSection),
    { v, material, section, errors } = parsed;
  const required = c.kind === "thermal" ? v.dT : c.kind === "udl" ? v.q : c.kind === "moment" ? v.M : v.P;
  const ready = Number.isFinite(v.L) && Number.isFinite(required) && !errors.length;
  let content = "",
    illustration = "",
    math = "",
    issue = "";
  try {
    const sample = {
      ...v,
      L: v.L > 0 ? v.L : 6000,
      P: Number.isFinite(v.P) ? v.P : 10000,
      q: Number.isFinite(v.q) ? v.q : 3,
      M: Number.isFinite(v.M) ? v.M : 1e7,
      dT: Number.isFinite(v.dT) ? v.dT : 20,
      a: Number.isFinite(v.a) ? v.a : 2000,
    };
    const model = withShearProperties(
      referenceModel(c.envelope ? referenceEnvelope(c).criticalCase : c, sample, section, material),
    );
    math = referenceEquations(c, sample.a / sample.L);
    if (ready) {
      usableMaterial(material);
      if (Math.abs(section.Iyz) > 1e-6 * section.Iy)
        throw Error(
          "This section has coupled bending. Use principal-axis properties; section geometry remains available in the library.",
        );
      const activeCase = c.envelope ? referenceEnvelope(c).criticalCase : c;
      const s = referenceSolution(activeCase, v.a / v.L),
        scale = referenceScales(c, v),
        r = referenceResult(c.envelope ? referenceEnvelope(c).criticalCase : c, v, model);
      const shearArea = v.As || energyShearArea(section).value;
      const G = v.G ?? material.G;
      const beta = G && G > 0 ? (v.E * v.I) / (G * shearArea * v.L * v.L) : undefined;
      const t = beta !== undefined ? referenceSolution(activeCase, v.a / v.L, beta) : undefined;
      const bend = t ? s.at(t.peakVb.x).v * scale.deflection : 0,
        total = t ? t.peakVb.value * scale.deflection : 0;
      const d = t
        ? {
            member: "M" + Math.min(c.spans, Math.floor(t.peakVb.x) + 1),
            x: (t.peakVb.x - Math.min(c.spans - 1, Math.floor(t.peakVb.x))) * v.L,
            bending: bend,
            increment: total - bend,
            total,
            curves: r.members.map((m, i) => ({
              member: m.id,
              stations: [
                ...new Set([
                  ...m.stations.map((p) => p.x),
                  ...(t.peakVb.x >= i && t.peakVb.x <= i + 1 ? [(t.peakVb.x - i) * v.L] : []),
                ]),
              ]
                .sort((a, b) => a - b)
                .map((x) => {
                  const bending = s.at(i + x / v.L).v * scale.deflection;
                  const total = t.at(i + x / v.L).v * scale.deflection;
                  return { x, bending, total, increment: total - bending };
                }),
            })),
            description:
              "Euler bending + Timoshenko−Euler increment at the same location, derived from integrated curvature and shear strain. In indeterminate systems the increment includes redistribution.",
          }
        : undefined;
      r.deformation = d;
      illustration =
        c.kind === "thermal" ? temperatureDrawing(model, r, section, v.dT) : analysisDashboard(model, r, section);
      const def = d
        ? `${fmt(Math.abs(d.bending))} mm (bending) + ${fmt(Math.sign(d.total || 1) * d.increment)} mm (shear increment)`
        : `${fmt(Math.abs(s.peakVb.value * scale.deflection))} mm (bending)`;
      const E = v.E,
        I = v.I,
        L = v.L,
        load = c.kind === "udl" ? v.q : c.kind === "moment" ? v.M : c.kind === "thermal" ? (v.alpha * v.dT) / v.h : v.P;
      content = `**Moment ${fmt((s.peakM.value * scale.moment) / 1e6)} kN·m**; shear ${fmt(Math.abs(s.peakV.value * scale.force) / 1000)} kN.\n\n**Deflection: ${def}**\n\n`;
      content += `Rotation: ${
        s.supports
          .map((p) => ({
            name: String.fromCharCode(65 + p.x),
            value: s.at(p.x).rotation * scale.rotation * 1000,
          }))
          .filter((p) => Math.abs(p.value) > 1e-8)
          .map((p) => `${p.name} ${fmt(p.value)} mrad`)
          .join("; ") || "restrained at both ends"
      }.\n\n`;
      content +=
        equation(
          `v_b=${coefficient(s.peakVb.value)}\\times ${c.kind === "thermal" ? `${load}\\times ${L}^2` : `\\frac{${load}\\times ${L}^{${c.kind === "udl" ? 4 : c.kind === "moment" ? 2 : 3}}}{${E}\\times ${I}}`}=${Number((s.peakVb.value * scale.deflection).toPrecision(5))}\\,\\mathrm{mm}`,
        ) + "\n\n";
      if (d) content += `${d.description}\n\n`;
      if (c.envelope) {
        const env = referenceEnvelope(c);
        content =
          `**Envelope of ${env.patterns} span-load patterns**\n\nM+ ${fmt((env.positive * scale.moment) / 1e6)} kN·m; M− ${fmt((env.negative * scale.moment) / 1e6)} kN·m; maximum |V| ${fmt((env.shear * scale.force) / 1000)} kN.\n\nMaximum bending deflection ${fmt(env.deflection * scale.deflection)} mm.\n\n| Support | Min reaction | Max reaction |\n|---|---:|---:|\n${env.reactions.map((r) => `| ${r.node} | ${fmt((r.min * scale.force) / 1000)} kN | ${fmt((r.max * scale.force) / 1000)} kN |`).join("\n")}\n\nThese extrema are not concurrent. Diagram below is the worst bending-deflection pattern (${env.criticalCase.pattern}).\n\n` +
          content;
      }
    } else
      illustration =
        c.kind === "thermal"
          ? temperatureDrawing(model, referenceResult(c, sample, model), section, sample.dT, true)
          : systemDrawing(model, section, true);
  } catch (e) {
    issue = (e as Error).message;
  }
  const md = `**${c.group}: ${c.title}**\n\n${pendingDataNotice(material.id)}\n\n${ready ? content : `Type **${example(c)}**. Span is ${c.spans > 1 ? "EACH span" : "in metres"}; load and section can be supplied in any order.\n\n${errors.length ? errors.join("; ") : "Illustration only until span and load are entered."}\n\n`}${issue ? `**Check input:** ${issue}\n\n` : ""}${illustration ? `![Section and structural case](${illustration})\n\n` : ""}**Equations for this arrangement${c.variable ? `, a/L = ${fmt(v.a / v.L || 1 / 3)}` : ""}**\n\n${math}\n\n${c.support === "guided" ? "Guided end: B can move vertically; its rotation is restrained.\n\n" : ""}${c.pointCount ? `Point forces are at ${Array.from({ length: c.pointCount }, (_, i) => fmt(((i + 1) * 100) / (c.pointCount! + 1)) + "%").join(", ")} of each span; P is EACH force.\n\n` : ""}${c.pattern ? `Pattern ${c.pattern}: 1 = loaded span, 0 = unloaded span. This is one concurrent arrangement, not an envelope.\n\n` : ""}Decimal coefficients are rounded to five significant figures.\n\nMethod: **analytical equilibrium + integrated M/EI compatibility**. Coefficients use constant EI; positive loads act downward, positive applied moments anticlockwise. L is each span; each displayed point force has magnitude P.\n\n${c.kind === "thermal" ? "ΔT = top minus bottom temperature; κT = −αΔT/h. α defaults from the selected material family and can be overridden; confirm the material’s applicable coefficient.\n\n" : ""}${c.kind === "thermal" ? `Thermal inputs: α=${v.alpha}/K, ΔT=${v.dT} K, h=${v.h} mm.\n\n` : ""}${material.id}; ${section.id}; E=${fmt(v.E)} MPa; I=${fmt(v.I)} mm⁴.\n\n${v.G ? `G=${fmt(v.G)} MPa; As=${fmt(v.As || energyShearArea(section).value)} mm². ${energyShearArea(section).source}. Enter G=… or As=… to override.` : "Shear increment needs G; enter G=690MPa or choose a complete material."}\n\n${c.source}`;
  const prior = parseReference(query.split(",").slice(0, -1).join(","), c, library, initialMaterial, initialSection);
  const choices = smartChoices(query, library, {
    numberKind: !Number.isFinite(prior.v.L)
      ? "L"
      : c.kind === "point"
        ? "P"
        : c.kind === "udl"
          ? "q"
          : c.kind === "moment"
            ? "M"
            : "dT",
    material,
    section,
    hasMaterial: !!parsed.quick.material,
    hasSection: !!parsed.quick.section,
    hasSpan: !!v.L,
    spanMetres: v.L / 1000,
    hasLoad: Number.isFinite(required),
    point: c.kind === "point",
    mode: "formula",
  });
  function choose(value: string, replace: boolean, commit = true) {
    setSelection("auto");
    const parts = query.split(",").map((s) => s.trim());
    if (replace) parts.pop();
    const prefix = parts.filter(Boolean).join(", ");
    setQuery((prefix ? prefix + ", " : "") + value + (commit ? ", " : ""));
  }
  return (
    <List
      navigationTitle={c.title}
      selectedItemId={selection === "auto" ? (choices.length ? choiceID(choices[0]) : "calculation") : selection}
      onSelectionChange={(id) => setSelection(id || "auto")}
      isShowingDetail
      filtering={false}
      searchText={query}
      onSearchTextChange={(s) => {
        setQuery(s);
        setSelection("auto");
      }}
      searchBarPlaceholder={example(c)}
    >
      <List.Item
        id="calculation"
        title="Calculation"
        subtitle={ready ? "Live result" : "Enter span and load"}
        detail={<List.Item.Detail markdown={previewMarkdown(md)} />}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Calculation" content={md} />
            <ViewActions markdown={md} title={c.title} />
          </ActionPanel>
        }
      />
      {choiceRows(choices, md, (x) => choose(x.value, x.replace, x.commit !== false), library)}
      {!Number.isFinite(v.L) && (
        <List.Item
          title="6m"
          subtitle="Span"
          detail={<List.Item.Detail markdown={previewMarkdown(md)} />}
          actions={
            <ActionPanel>
              <Action title="Use 6M" onAction={() => choose("6m", false)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
export default function ReferenceLibrary(props: { initialMaterial?: Material; initialSection?: Section } = {}) {
  const { library, error, selection, reload } = useLibrary(),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState("all"),
    [selected, setSelected] = useState(""),
    { push } = useNavigation();
  if (error) return <LibraryError message={error} reload={reload} />;
  if (!library) return <List isLoading />;
  const material = props.initialMaterial || defaultMaterial(library, selection),
    section = props.initialSection || defaultSection(library, selection);
  const cases = referenceCases.filter(
    (c) =>
      (group === "all" || c.group === group) && (!query || fuzzyScore(query, c.title + " " + c.group + " " + c.id) > 0),
  );
  const chosen = cases.some((c) => c.id === selected) ? selected : cases[0]?.id;
  return (
    <List
      selectedItemId={chosen}
      onSelectionChange={(id) => setSelected(id || "")}
      navigationTitle="Structures / Formula reference"
      isShowingDetail
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Cantilever, triangular load, temperature, 3 spans…"
      searchBarAccessory={
        <List.Dropdown tooltip="Case family" value={group} onChange={setGroup}>
          <List.Dropdown.Item title="All cases" value="all" />
          {[...new Set(referenceCases.map((c) => c.group))].map((g) => (
            <List.Dropdown.Item key={g} title={g} value={g} />
          ))}
        </List.Dropdown>
      }
    >
      {[...new Set(cases.map((c) => c.group))].map((g) => (
        <List.Section key={g} title={g}>
          {cases
            .filter((c) => c.group === g)
            .map((c) => {
              if (c.id !== chosen)
                return (
                  <List.Item
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    icon={Icon.Calculator}
                    detail={<List.Item.Detail markdown={c.title} />}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Open Reference Calculator"
                          onAction={() =>
                            push(
                              <ReferenceCalculator
                                c={c}
                                library={library}
                                initialMaterial={material}
                                initialSection={section}
                              />,
                            )
                          }
                        />
                      </ActionPanel>
                    }
                  />
                );
              const v: RefInput = {
                L: 6000,
                P: 10000,
                q: 3,
                M: 1e7,
                E: material.E || 11000,
                I: section.Iy,
                a: 2000,
                alpha: 12e-6,
                dT: 20,
                h: section.h,
              };
              const model = referenceModel(c.envelope ? referenceEnvelope(c).criticalCase : c, v, section, material),
                preview =
                  c.kind === "thermal"
                    ? temperatureDrawing(model, referenceResult(c, v, model), section, v.dT, true)
                    : systemDrawing(model, section, true);
              const md = `**${c.group}: ${c.title}**\n\n${pendingDataNotice(material.id)}\n\n![Illustrative arrangement](${preview})\n\nIllustration: ${example(c)}. Enter to open this calculator.\n\n${referenceEquations(c, 1 / 3)}\n\n${c.variable ? "Coefficients shown at a/L = 1/3; entering a position updates them.\n\n" : ""}${c.spans > 1 ? "L is EACH span. " : ""}${c.pattern ? `Load pattern ${c.pattern}; 1 means loaded. ` : ""}See rotations, reactions, moments and deformation together.\n\n${c.source}`;
              return (
                <List.Item
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  icon={Icon.Calculator}
                  detail={<List.Item.Detail markdown={previewMarkdown(md)} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Open Reference Calculator"
                        onAction={() =>
                          push(
                            <ReferenceCalculator
                              c={c}
                              library={library}
                              initialMaterial={material}
                              initialSection={section}
                            />,
                          )
                        }
                      />
                      <ViewActions markdown={md} title={c.title} />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
    </List>
  );
}
