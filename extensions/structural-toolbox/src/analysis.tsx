import { ViewActions, previewMarkdown, EnlargeDiagramRow } from "./ui/view-actions";
import { beamChoices } from "./core/beam-choices";
import { cleanSectionName, preferredMaterial, choiceID } from "./core/smart-choices";
import { choiceRows } from "./ui/choices";
import { equation, formulaTex } from "./ui/equations";
import { withShearProperties, deformationParts } from "./core/deformation";
import FormulasCommand from "./formulas";
import { FormulaCalculator } from "./formula-command";
import ReferenceLibrary from "./reference-library";
import LibraryCommand from "./library";
import { Action, ActionPanel, Form, Icon, List, Detail, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { analyze, loadComponents } from "./core/engine";
import { buildModel, AnalysisInput, Template, templateNames } from "./core/templates";
import { Library, fuzzyScore, usableMaterial, pendingDataNotice } from "./core/library";
import { parseQuick, quantity, spansInput, pointLocation } from "./core/input";
import { Formula, FormulaValues, formulas } from "./core/formulas";
import { Material, Model, Result, Section } from "./core/types";
import {
  defaultMaterial,
  defaultSection,
  fmt,
  rememberSelection,
  saveCalculation,
  savedCalculations,
  useLibrary,
} from "./ui/state";
import { systemDrawing, resultDiagrams, sectionDrawing, analysisDashboard } from "./ui/drawings";
import { LibraryError, reportError } from "./ui/common";
import { analysisGuidance, shapeDefaults } from "./core/guidance";
import { memberName, activeResponse, ResponseKey } from "./core/presentation";
import { sectionStresses } from "./core/stresses";
import { systemExample, annotatedExample, stageExamples } from "./ui/input-help";
import { customSection } from "./core/sections";
interface Props {
  initialQuery?: string;
  initialMaterial?: Material;
  initialSection?: Section;
  initialFormula?: Formula;
  initialValues?: FormulaValues;
  initialEOverride?: number;
  restored?: Config;
}
interface Config {
  template: Template;
  spans: string;
  pitch: string;
  q: string;
  material: Material;
  section: Section;
  E: string;
  G: string;
  density: string;
  axis: "y" | "z";
  direction: "globalZ" | "globalX" | "localZ";
  basis: "member" | "projected";
  theory: "euler" | "timoshenko";
  shearArea: string;
  supports: string;
  tie: boolean;
  ridgeHinge: boolean;
  selfWeight: boolean;
  leftOverhang: string;
  rightOverhang: string;
  pointValue: string;
  pointPosition: string;
  pointMember: string;
  jointLoad: string;
}
function configModel(c: Config): Model {
  if (!c.E) usableMaterial(c.material);
  if (c.q.trim() === "" && c.pointValue.trim() === "" && c.jointLoad.trim() === "" && !c.selfWeight)
    throw Error("Enter a load, or explicitly enter q = 0 for an unloaded model.");
  const input: AnalysisInput = {
    template: c.template,
    spans: spansInput(c.spans),
    pitch: Number(c.pitch || 0),
    q: c.q.trim() ? quantity(c.q, "line") : 0,
    section: c.section,
    material: c.material,
    E: c.E ? quantity(c.E, "modulus") : undefined,
    G: c.G ? quantity(c.G, "modulus") : undefined,
    density: c.density ? Number(c.density) : undefined,
    axis: c.axis,
    direction: c.direction,
    basis: c.basis,
    theory: c.theory,
    shearArea: c.shearArea ? quantity(c.shearArea, "area") : undefined,
    supports: c.supports,
    tie: c.tie,
    ridgeHinge: c.ridgeHinge,
    selfWeight: c.selfWeight,
    leftOverhang: quantity(c.leftOverhang || "0", "length"),
    rightOverhang: quantity(c.rightOverhang || "0", "length"),
    point: c.pointValue
      ? {
          member: c.pointMember,
          value: quantity(c.pointValue, "force") * 1000,
          ...pointLocation(c.pointPosition),
        }
      : undefined,
    jointLoad: c.jointLoad ? quantity(c.jointLoad, "force") * 1000 : undefined,
  };
  return withShearProperties(buildModel(input));
}
function governingEquations(model: Model) {
  if (model.members.every((m) => m.type === "truss"))
    return (
      equation("N=EA\\frac{du}{dx},\\quad \\sigma=\\frac{N}{A},\\quad \\mathbf K\\mathbf u=\\mathbf F") +
      "\n\nAxial-only truss; loads act at joints.\n\n"
    );

  return (
    equation("\\frac{dV}{dx}=-q,\\quad \\frac{dM}{dx}=V,\\quad M=EI\\frac{d\\theta}{dx}") +
    "\n\n" +
    equation(
      model.theory === "timoshenko"
        ? "\\frac{dv}{dx}=\\theta-\\frac{V}{GA_s},\\quad \\mathbf K\\mathbf d=\\mathbf F"
        : "EI\\frac{d^4v}{dx^4}=-q,\\quad \\mathbf K\\mathbf d=\\mathbf F",
    ) +
    "\n\n"
  );
}
function standardEquation(model: Model, c?: Config, focus?: ResponseKey | "reactions" | "stresses"): string {
  if (
    !c ||
    model.members.length !== 1 ||
    model.memberLoads.length !== 1 ||
    model.nodalLoads.length ||
    Number(c.pitch) !== 0 ||
    c.supports ||
    c.selfWeight ||
    model.theory !== "euler"
  )
    return governingEquations(model);
  const load = model.memberLoads[0],
    L = Math.abs(model.nodes[1].x - model.nodes[0].x);
  if (load.direction !== "globalZ" || load.magnitude >= 0 || load.start || load.endMagnitude !== undefined)
    return governingEquations(model);
  const prefix: Record<string, string> = {
    simple: "ss",
    cantilever: "cant",
    fixed: "fixed",
    propped: "propped",
  };
  if (!prefix[c.template]) return governingEquations(model);
  if (load.kind === "point" && Math.abs((load.position ?? L / 2) - (c.template === "cantilever" ? L : L / 2)) > 1e-6)
    return governingEquations(model);
  const f = formulas.find((f) => f.id === prefix[c.template] + "-" + (load.kind === "udl" ? "udl" : "point"));
  return (
    (f
      ? "Matched standard case: `" +
        f.equation +
        "`\n\n" +
        equation(
          formulaTex(
            f.id +
              "@" +
              (focus === "V" ? "shear" : focus === "v" ? "deflection" : focus === "reactions" ? "reactions" : "moment"),
            f.equation,
          ),
        ) +
        (focus ? "" : "\n\n" + equation(formulaTex(f.id + "@deflection", f.equation))) +
        "\n\n"
      : "") + governingEquations(model)
  );
}
function modelLoadList(model: Model): string {
  return model.memberLoads
    .map((l) => {
      const m = model.members.find((m) => m.id === l.member)!,
        a = model.nodes.find((n) => n.id === m.start)!,
        b = model.nodes.find((n) => n.id === m.end)!,
        L = Math.hypot(b.x - a.x, b.z - a.z),
        [qx, qz] = loadComponents(l, (b.x - a.x) / L, (b.z - a.z) / L);
      return `- **${memberName(model, l.member)}**: ${l.kind} ${fmt(l.magnitude)} ${l.kind === "udl" ? "N/mm" : l.kind === "point" ? "N" : "N·mm"}, ${l.direction}, ${l.basis}\n  ${l.kind === "moment" ? "Applied moment" : `Resolved local x = ${fmt(qx)}, local z = ${fmt(qz)} ${l.kind === "udl" ? "N/mm" : "N"}`}`;
    })
    .join("\n");
}
function resultMarkdown(model: Model, r: Result, c?: Config, focus?: ResponseKey | "reactions" | "stresses") {
  const stresses = sectionStresses(model, r, c?.section, c?.axis || "y");
  const parameters = c
    ? `**${templateNames[c.template]}**; **${c.material.id}**, E = ${fmt(c.E ? quantity(c.E, "modulus") : c.material.E!)} MPa${c.G || c.material.G ? ", G = " + fmt(c.G ? quantity(c.G, "modulus") : c.material.G!) + " MPa" : ""}.\n\n**${cleanSectionName(c.section)}**; I${c.axis} = ${fmt(c.axis === "y" ? c.section.Iy : c.section.Iz)} mm⁴.`
    : "";

  const stressLocation = (s: { member: string; x: number }) => `${memberName(model, s.member)}, ${fmt(s.x / 1000)} m`;
  if (focus === "stresses") {
    if (!stresses) return "**Section stresses need matching section geometry.**";
    const rows = [
      ["Axial N/A", stresses.axial],
      ["Bending stress", stresses.bending],
      ["Normal tension, N + M", stresses.tension],
      ["Normal compression, N + M", stresses.compression],
      ["Transverse shear", stresses.shear],
      ...(c?.material.family === "Steel" ? [["von Mises (elastic)", stresses.vonMises]] : []),
    ]
      .filter(([, s]) => Math.abs((s as any).value) > 1e-8)
      .map(([label, s]) => {
        const p = s as any;
        return `| ${label} | **${fmt(p.value)} MPa** | ${stressLocation(p)} |`;
      })
      .join("\n");
    return `![System, loads and reactions](${systemDrawing(model, c?.section, true, r)})\n\n${parameters}\n\n**Elastic section stresses**\n\n| Stress | Peak | Position |\n|---|---:|---|\n${rows}\n\n${equation("\\sigma=\\frac{N}{A}-\\frac{Mz}{I},\\quad \\tau=\\frac{VQ}{Ib}")}\n\n Combined normal stresses use concurrent N and M at each station. Von Mises uses concurrent normal and shear stresses at the same fibre. No torsion or local concentrations.\n\n${stresses.notes.join(" ")}\n\nElastic homogeneous section, no cracking, creep or code resistance checks.`;
  }
  if (!focus) {
    let split = "";
    try {
      const d = r.deformation;
      if (d)
        split = `**Deflection:** ${fmt(Math.abs(d.bending))} mm (bending) + ${fmt(Math.sign(d.total || 1) * d.increment)} mm (shear increment), at ${memberName(model, d.member)}, ${fmt(d.x / 1000)} m.\n\n${d.description}\n\n`;
    } catch {
      /* Missing G/area leaves the qualified Euler result. */
    }
    return `![Analysis summary, reactions and results](${analysisDashboard(model, r, c?.section, c?.axis || "y", false, { material: c?.material.id })})\n\n${parameters}\n\n**Results and equations**\n\n${split}${c && pendingDataNotice(c.material.id) ? pendingDataNotice(c.material.id) : ""}\n\n${standardEquation(model, c)}Method: **2D finite elements**. Equations explain the mechanics; standard-case formulas are additional cross-checks.\n\n${r.warnings.join(" ")}`;
  }
  const all = r.members.flatMap((m) => m.stations.map((s) => ({ ...s, member: m.id })));
  const deflectionStations = r.deformation?.curves.flatMap((m) => m.stations.map((s) => ({ ...s, member: m.member })));
  const loc = (s: { member: string; x: number }) => `${memberName(model, s.member)}, ${fmt(s.x / 1000)} m from start`;
  const lines: string[] = [];
  for (const [key, label, factor, unit] of [
    ["M", "Bending moment", 1e-6, "kN·m"],
    ["V", "Shear force", 0.001, "kN"],
    ["N", "Axial force", 0.001, "kN"],
    ["v", "Transverse deflection", 1, "mm"],
  ] as const) {
    if (focus === "reactions" || (focus && focus !== key) || !activeResponse(r, key)) continue;
    if (key === "v" && deflectionStations?.length) {
      const p = deflectionStations.reduce((a, b) => (Math.abs(a.total) > Math.abs(b.total) ? a : b));
      lines.push(`| Total transverse deflection | **${fmt(p.total)} mm** | ${loc(p)} |`);
      lines.push(`| Bending at same position | **${fmt(p.bending)} mm** | ${loc(p)} |`);
      lines.push(`| Shear increment at same position | **${fmt(p.increment)} mm** | ${loc(p)} |`);
      continue;
    }
    const high = all.reduce((a, b) => (a[key] > b[key] ? a : b)),
      low = all.reduce((a, b) => (a[key] < b[key] ? a : b));
    const extremes =
      key === "M"
        ? [high, low].filter((s) => Math.abs(s[key]) > 1e-3)
        : [Math.abs(high[key]) > Math.abs(low[key]) ? high : low];
    for (const s of extremes)
      lines.push(
        `| ${label}${key === "M" ? (s.M > 0 ? " (sagging)" : " (hogging)") : ""} | **${fmt(s[key] * factor)} ${unit}** | ${loc(s)} |`,
      );
  }
  if (
    (!focus || focus === "globalZ") &&
    activeResponse(r, "globalZ") &&
    (!activeResponse(r, "v") || focus === "globalZ")
  ) {
    const s = all.reduce((a, b) => (Math.abs(a.globalZ) > Math.abs(b.globalZ) ? a : b));
    lines.push(`| Vertical displacement | **${fmt(s.globalZ)} mm** | ${loc(s)} |`);
  }
  const supports = model.nodes.filter((n) => n.restraints.some(Boolean));
  const columns = [
    { i: 0, label: "Horizontal (kN)", factor: 0.001 },
    { i: 1, label: "Vertical (kN)", factor: 0.001 },
    { i: 2, label: "Moment (kN·m)", factor: 1e-6 },
  ].filter((col) => supports.some((n) => Math.abs(r.reactions[n.id][col.i]) > (col.i === 2 ? 1e-3 : 1e-5)));
  const reactions = columns.length
    ? `### Support reactions\n\n| Support | ${columns.map((c) => c.label).join(" | ")} |\n|---|${columns.map(() => "---:|").join("")}\n${supports.map((n) => `| ${n.id} | ${columns.map((c) => fmt(r.reactions[n.id][c.i] * c.factor)).join(" | ")} |`).join("\n")}`
    : "";
  const title =
    focus === "reactions"
      ? "Support reactions"
      : focus
        ? (
            {
              M: "Bending moment",
              V: "Shear force",
              N: "Axial force",
              v: "Deflection",
              globalZ: "Vertical displacement",
              globalX: "Horizontal displacement",
            } as const
          )[focus]
        : "Analysis results";
  return `![System and actual loads](${systemDrawing(model, c?.section, true, r)})\n\n${focus !== "reactions" && lines.length ? `![Shaded result diagrams](${resultDiagrams(model, r, focus)})\n\n` : ""}${parameters}\n\n**${title}**\n\n${focus !== "reactions" && lines.length ? `| Result | Value | Position |\n|---|---:|---|\n${lines.join("\n")}\n\n` : ""}${focus === "reactions" ? reactions + "\n\n" : ""}${standardEquation(model, c, focus)}${r.warnings.join("\n\n")}`;
}
function ModelEditor({ config, library, onApply }: { config: Config; library: Library; onApply: (v: Config) => void }) {
  const { pop } = useNavigation(),
    [template, setTemplate] = useState(config.template),
    [material, setMaterial] = useState(config.material),
    [section, setSection] = useState(config.section),
    [theory, setTheory] = useState(config.theory);
  const roof = template === "roof" || template === "truss";
  return (
    <Form
      navigationTitle="Edit Structural Model"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply & Analyze"
            onSubmit={(v: Record<string, string | boolean>) => {
              try {
                const next: Config = {
                  ...config,
                  ...v,
                  template,
                  material,
                  section,
                  theory,
                } as Config;
                if (template === "truss") {
                  next.q = "0";
                  next.pointValue = "";
                }
                analyze(configModel(next));
                onApply(next);
                rememberSelection(material, section);
                pop();
              } catch (e) {
                reportError(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="template" title="System" value={template} onChange={(v) => setTemplate(v as Template)}>
        {Object.entries(templateNames).map(([k, v]) => (
          <Form.Dropdown.Item key={k} title={v} value={k} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="spans"
        title={roof ? "Total horizontal span, m" : "Horizontal spans, m"}
        defaultValue={config.spans}
        placeholder={roof ? "8m" : "4/5/4m"}
        info="Up to 5 supported spans, separated by /. For roof/truss enter one overall span."
      />
      <Form.TextField id="pitch" title="Pitch, degrees" defaultValue={config.pitch} placeholder={roof ? "30" : "0"} />
      <Form.TextField
        id="supports"
        title="Supports, start to end"
        defaultValue={config.supports}
        placeholder={
          roof ? (template === "truss" || config.tie ? "pin/free/roller" : "pin/free/pin") : "pin/roller/roller/roller"
        }
        info="Optional override for every node, including ridge and overhang tips. pin = X+Z; roller = Z; xroller = X; fixed = X+Z+rotation; free = none. Blank uses visible template arrangement."
      />
      {!roof && (
        <>
          <Form.TextField id="leftOverhang" title="Left overhang, horizontal m" defaultValue={config.leftOverhang} />
          <Form.TextField id="rightOverhang" title="Right overhang, horizontal m" defaultValue={config.rightOverhang} />
        </>
      )}
      {roof && (
        <>
          <Form.Checkbox
            id="tie"
            label="Bottom tie, axial member"
            defaultValue={config.tie}
            info="True triangular truss always includes a bottom chord. Roof without tie uses horizontal restraints at both eaves."
          />
          <Form.Checkbox
            id="ridgeHinge"
            label="Pinned rafter connections"
            defaultValue={config.ridgeHinge}
            info="For roof rafters, releases bending moments at eaves and ridge; bending under member loads remains."
          />
        </>
      )}
      <Form.Separator />
      <Form.Dropdown
        id="materialID"
        title="Material preset"
        value={material.id}
        onChange={(v) => setMaterial(library.materials.find((m) => m.id === v) || material)}
      >
        {[material, ...library.materials.filter((m) => m.id !== material.id)]
          .filter((m) => m.status !== "TEMPLATE" && !["CLT", "Panel"].includes(m.family))
          .map((m) => (
            <Form.Dropdown.Item key={m.id} title={`${m.id}, ${m.family}`} value={m.id} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="sectionID"
        title="Section preset"
        value={section.id}
        onChange={(v) => setSection(library.sections.find((s) => s.id === v) || section)}
      >
        {[section, ...library.sections.filter((s) => s.id !== section.id)].map((s) => (
          <Form.Dropdown.Item key={s.id} title={s.id} value={s.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="axis" title="Bending axis" defaultValue={config.axis}>
        <Form.Dropdown.Item value="y" title="y, Iy" />
        <Form.Dropdown.Item value="z" title="z, Iz" />
      </Form.Dropdown>
      <Form.TextField
        id="E"
        title="Custom E, MPa"
        defaultValue={config.E}
        placeholder={String(material.E ?? "Required")}
        info="Blank follows the selected preset. A typed override remains when the preset changes."
      />
      <Form.TextField
        id="G"
        title="Custom G, MPa"
        defaultValue={config.G}
        placeholder={String(material.G ?? "Unavailable")}
      />
      <Form.TextField
        id="density"
        title="Custom density, kg/m³"
        defaultValue={config.density}
        placeholder={String(material.density ?? "Unavailable")}
      />
      <Form.Dropdown id="theory" title="Beam theory" value={theory} onChange={(v) => setTheory(v as Config["theory"])}>
        <Form.Dropdown.Item value="euler" title="Euler–Bernoulli, bending only" />
        <Form.Dropdown.Item value="timoshenko" title="Timoshenko, bending + shear" />
      </Form.Dropdown>
      {theory === "timoshenko" && (
        <Form.TextField
          id="shearArea"
          title="Effective shear area, mm²"
          defaultValue={config.shearArea}
          placeholder={
            section.shape === "rectangle" ? String((5 * section.A) / 6) : "Catalogue value or explicit input"
          }
          info="Solid rectangle uses 5A/6; solid circle uses 6A/7. Other sections require catalogue or custom effective shear area."
        />
      )}
      <Form.Separator />
      <Form.Dropdown id="direction" title="Load direction axis" defaultValue={config.direction}>
        <Form.Dropdown.Item value="globalZ" title="Global Z, positive up" />
        <Form.Dropdown.Item value="globalX" title="Global X, positive right" />
        <Form.Dropdown.Item value="localZ" title="Local z, see member start/end axes" />
      </Form.Dropdown>
      <Form.Dropdown id="basis" title="UDL measured over" defaultValue={config.basis}>
        <Form.Dropdown.Item value="member" title="Member length" />
        <Form.Dropdown.Item value="projected" title="Horizontal projected length" />
      </Form.Dropdown>
      {template !== "truss" && (
        <>
          <Form.TextField
            id="q"
            title="Signed UDL, kN/m"
            defaultValue={config.q}
            placeholder="−5 (global Z downward)"
            info="Applies to all frame members. Positive/negative signs are explicit. Use advanced model for different loads per member, intervals or varying loads."
          />
          <Form.TextField
            id="pointValue"
            title="Member point load, kN"
            defaultValue={config.pointValue}
            placeholder="Optional, e.g. -10"
          />
          <Form.Dropdown id="pointMember" title="Point load target" defaultValue={config.pointMember}>
            {(roof
              ? ["Left rafter", "Right rafter"]
              : Array.from({ length: Math.max(1, config.spans.split("/").length) }, (_, i) => "Span " + (i + 1))
            ).map((label, i) => (
              <Form.Dropdown.Item key={i} value={"M" + (i + 1)} title={label} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="pointPosition"
            title="Point position"
            defaultValue={config.pointPosition}
            placeholder="Midpoint, or enter 2m or 40%"
            info="Blank uses the member midpoint. Distance is measured along the member from its start. Use horizontal 2m for a horizontal position."
          />
        </>
      )}
      {template === "truss" && (
        <Form.TextField
          id="jointLoad"
          title="Ridge joint Z load, kN"
          defaultValue={config.jointLoad}
          placeholder="−10"
        />
      )}
      <Form.Checkbox
        id="selfWeight"
        label="Include self-weight as a separate global −Z load"
        defaultValue={config.selfWeight}
        info="Truss self-weight is explicitly lumped half to each end node."
      />
    </Form>
  );
}
function AdvancedEditor({ model, onApply }: { model: Model; onApply: (m: Model) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Advanced Nodes, Members & Loads"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Validate & Analyze"
            onSubmit={(v: { model: string }) => {
              try {
                const m = JSON.parse(v.model) as Model;
                analyze(m);
                onApply(m);
                pop();
              } catch (e) {
                reportError(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Units"
        text="N, mm, MPa, N·mm; line loads N/mm. Coordinates use global X–Z. Member load positions and intervals are measured along member start → end. Forces are signed."
      />
      <Form.TextArea
        id="model"
        title="Model JSON"
        defaultValue={JSON.stringify(model, null, 2)}
        info="Edit nodes, restraints [X,Z,rotation], members, nodalLoads and memberLoads. UDL may include start/end in mm and endMagnitude for trapezoidal loading. kind: point, udl, moment. direction: globalX, globalZ, localX, localZ. basis: member or projected."
      />
    </Form>
  );
}
function SavedModels({ onRestore }: { onRestore: (c: Config | Model) => void }) {
  const { pop } = useNavigation();
  return (
    <List searchBarPlaceholder="Saved analysis snapshots">
      {savedCalculations()
        .filter((r) => r.kind === "analysis")
        .map((r, j) => (
          <List.Item
            key={j}
            title={r.title}
            subtitle={r.date.slice(0, 16)}
            actions={
              <ActionPanel>
                <Action
                  title="Restore Property Snapshot"
                  onAction={() => {
                    onRestore(r.input);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
export default function AnalysisCommand(props: Props = {}) {
  const { library, error, selection, reload } = useLibrary(),
    [query, setQuery] = useState(props.initialQuery || ""),
    [config, setConfig] = useState<Config>(),
    [advanced, setAdvanced] = useState<Model>(),
    [selected, setSelected] = useState("auto");
  const { push } = useNavigation();
  const quick = useMemo(() => (library ? parseQuick(query, library) : undefined), [query, library]);
  if (error) return <LibraryError message={error} reload={reload} />;
  if (!library) return <List isLoading searchText={query} onSearchTextChange={setQuery} />;
  const v = props.initialValues;
  const base: Config = config ||
    props.restored || {
      template: props.initialFormula?.beam || "simple",
      spans: v
        ? props.initialFormula?.beam === "continuous"
          ? `${v.L / 1000}/${v.L / 1000}`
          : String(v.L / 1000)
        : "",
      pitch: "0",
      q: v && props.initialFormula?.loading === "udl" ? String(-v.q) : "",
      pointValue: v && props.initialFormula?.loading === "point" ? String(-v.P / 1000) : "",
      pointPosition: v
        ? String(
            props.initialFormula?.inputs.includes("a")
              ? v.a / 1000
              : props.initialFormula?.id.startsWith("cant-point")
                ? v.L / 1000
                : v.L / 2000,
          )
        : "",
      pointMember: "M1",
      material: props.initialMaterial || defaultMaterial(library, selection),
      section: props.initialSection || defaultSection(library, selection),
      E: props.initialEOverride !== undefined ? String(props.initialEOverride) : "",
      G: "",
      density: "",
      axis: "y",
      direction: "globalZ",
      basis: "member",
      theory: "euler",
      shearArea: "",
      supports: "",
      tie: false,
      ridgeHinge: true,
      selfWeight: false,
      leftOverhang: "0",
      rightOverhang: "0",
      jointLoad: "",
    };
  const current: Config = {
    ...base,
    ...(quick?.template ? { template: quick.template } : {}),
    ...(quick?.material
      ? { material: quick.material }
      : quick?.section && !props.initialMaterial && !config
        ? { material: preferredMaterial(quick.section, library) }
        : {}),
    ...(quick?.section ? { section: quick.section } : {}),
    ...(quick?.spans ? { spans: quick.spans.join("/") } : {}),
    ...(quick?.pitch !== undefined ? { pitch: String(quick.pitch) } : {}),
    ...(quick?.q !== undefined ? { q: String(quick.q) } : {}),
    ...(quick?.P !== undefined
      ? (quick?.template || base.template) === "truss"
        ? { jointLoad: String(quick.P), pointValue: "" }
        : { pointValue: String(quick.P) }
      : {}),
    ...(quick?.pointPosition !== undefined ? { pointPosition: quick.pointPosition } : {}),
    ...(quick?.pointMember ? { pointMember: quick.pointMember } : {}),
    ...(quick?.loadSense && quick.q === undefined && base.q
      ? {
          q: String(Math.abs(quantity(base.q, "line")) * (quick.loadSense === "up" ? 1 : -1)),
        }
      : {}),
    ...(quick?.loadSense && quick.P === undefined && base.pointValue
      ? {
          pointValue: String(Math.abs(quantity(base.pointValue, "force")) * (quick.loadSense === "up" ? 1 : -1)),
        }
      : {}),
    ...(quick?.direction ? { direction: quick.direction } : {}),
    ...(quick?.basis ? { basis: quick.basis } : {}),
    ...(quick?.E !== undefined ? { E: String(quick.E) } : {}),
    ...(quick?.G !== undefined ? { G: String(quick.G) } : {}),
  };
  const committedModel = !!config || !!props.restored || !!props.initialValues || !!advanced;
  const confirmed = {
    system:
      !!quick?.template ||
      committedModel ||
      !!(quick?.spans && (quick.q !== undefined || quick.P !== undefined) && quick.material && quick.section),
    material: !!quick?.material || committedModel,
    section: !!quick?.section || committedModel,
    direction: !!quick?.direction || !!quick?.basis || committedModel,
  };
  const guidance = analysisGuidance(query, quick!, { ...current, confirmed });
  const pending = quick?.pendingSection;
  let diagramSection = current.section;
  if (pending) {
    try {
      diagramSection = customSection(
        pending.shape,
        shapeDefaults[pending.shape].map(
          (v, j) =>
            pending.values[j] ??
            (current.spans && ((pending.shape === "rectangle" && j === 1) || (pending.shape !== "rectangle" && j === 0))
              ? Math.max(1, Math.round(Math.max(...spansInput(current.spans)) * 50))
              : v),
        ),
      );
    } catch {
      /* Keep last valid section while dimensions are incomplete. */
    }
  }
  let model: Model | undefined,
    result: Result | undefined,
    problem = "";
  try {
    if (["system", "span", "material", "section", "direction"].includes(guidance.kind)) throw Error(guidance.title);
    if (guidance.kind === "pitch") throw Error("Enter the roof pitch to calculate");
    if (pending) throw Error("Complete the section dimensions to calculate.");
    if (
      /^[+-]?[\d.]+$/.test(query.split(",").at(-1)?.trim() || "") &&
      current.spans &&
      query.split(",").filter(Boolean).length > 1
    )
      throw Error("Choose kN/m or kN below to confirm what this number means.");
    if (quick?.messages.length || quick?.unresolved.length)
      throw Error([...quick.messages, ...quick.unresolved].join("; "));
    model = advanced || configModel(current);
    result = analyze(model);
    result.deformation = deformationParts(model);
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  let preview = model;
  if (!preview) {
    try {
      preview = configModel({
        ...current,
        section: diagramSection,
        spans: current.spans || (quick?.spanCount ? Array(quick.spanCount).fill(6).join("/") : "6"),
        pitch:
          (current.template === "roof" || current.template === "truss") && !(Number(current.pitch) > 0)
            ? "30"
            : current.pitch,
        q: current.q || "0",
        pointValue: current.pointValue,
        jointLoad: current.jointLoad || "0",
        selfWeight: false,
      });
    } catch {
      /* Invalid geometry retains the section preview. */
    }
  }
  const shortLabel = (
    {
      system: "System",
      span: "Span",
      section: "Dimensions",
      pitch: "Roof pitch",
      direction: "Load direction",
      load: "Load",
      material: "Material",
      ready: "Ready",
      error: "Check input",
    } as const
  )[guidance.kind];
  const systemName = templateNames[current.template];
  const loadDescription = model ? modelLoadList(model) : "";
  const previewImage = pending
    ? sectionDrawing(diagramSection)
    : preview
      ? systemDrawing(preview, confirmed.section ? diagramSection : undefined, true)
      : "";
  const pitchDescription = ["roof", "truss", "inclined"].includes(current.template)
    ? Number(current.pitch)
      ? "; pitch " + fmt(Number(current.pitch)) + "°"
      : "; pitch not entered (drawing is illustrative)"
    : "";
  const inputParameters = `**${confirmed.system ? systemName : "System: choose below"}**${current.spans ? "; span " + current.spans + " m" : "; span not entered"}${pitchDescription}\n\nMaterial: ${confirmed.material ? "**" + current.material.id + "**, E=" + fmt(current.E ? quantity(current.E, "modulus") : current.material.E!) + " MPa" : "choose after the load"}. Section: ${confirmed.section ? cleanSectionName(current.section) : "choose after the material"}.`;
  const intro = `${previewImage ? "![Model preview](" + previewImage + ")\n\n" : ""}${inputParameters}\n\n**Next: ${guidance.title}**\n\n${guidance.hint}\n\n${problem && guidance.kind === "ready" ? "**Check input:** " + problem + "\n\n" : ""}${!query.trim() ? "Example: " + annotatedExample(current.template) + "\n\n" : ""}${!current.spans ? "The 6 m geometry is illustrative until you enter a span." : "Preview only until the required inputs are confirmed."}`;
  const inputHelp = "";
  const markdown = result && model ? resultMarkdown(model, result, advanced ? undefined : current) : intro;
  function acceptSuggestion(value: string, replace = false, commit = true) {
    const parts = query.split(",").map((s) => s.trim());
    if (replace) parts.pop();
    const prefix = parts.filter(Boolean).join(", ");
    setQuery((prefix ? prefix + ", " : "") + value + (commit ? ", " : ""));
    setSelected("auto");
  }

  const apply = (c: Config) => {
    setConfig(c);
    setAdvanced(undefined);
    setQuery("");
    setSelected("results");
  };
  const edit = (
    <Action
      title="Edit Model & Material"
      icon={Icon.Pencil}
      onAction={() => push(<ModelEditor config={current} library={library} onApply={apply} />)}
    />
  );
  const viewFocus = selected.match(/^response-(M|V|N|v|globalZ|stresses|reactions)$/)?.[1] as
    ResponseKey | "stresses" | "reactions" | undefined;
  const fullViewMarkdown =
    model && result && viewFocus ? resultMarkdown(model, result, advanced ? undefined : current, viewFocus) : markdown;
  const actions = (
    <ActionPanel>
      {result && selected !== "edit" && <ViewActions markdown={fullViewMarkdown} title={systemName} />}
      {edit}
      {(!result || selected === "edit") && <ViewActions markdown={fullViewMarkdown} title={systemName} />}
      {model && (
        <Action
          title="Advanced Nodes & Loads"
          icon={Icon.Gear}
          onAction={() =>
            push(
              <AdvancedEditor
                model={model!}
                onApply={(m) => {
                  setAdvanced(m);
                  setQuery("");
                  setSelected("results");
                }}
              />,
            )
          }
        />
      )}
      <Action
        title="Open Saved Analyses"
        icon={Icon.Clock}
        onAction={() =>
          push(
            <SavedModels
              onRestore={(c) => {
                "nodes" in c ? setAdvanced(c) : apply(c);
                setQuery("");
              }}
            />,
          )
        }
      />
      {model && result && (
        <Action
          title="View Equations and Load Details"
          onAction={() =>
            push(
              <Detail
                markdown={`# Equations and model details\n\n${standardEquation(model, current)}\n\n\`Kd = F; R = Kd − F\`\n\n\`N = EA du/dx; M = EI dθ/dx\`\n\n${modelLoadList(model)}\n\nFree-DOF residual: ${result.residual.toExponential(2)}.\n\nSmall-displacement linear elastic analysis; no code resistance checks, cracking or creep.`}
              />,
            )
          }
        />
      )}
      <Action.CopyToClipboard title="Copy Results" content={markdown} />
      {model && result && (
        <>
          <Action.CopyToClipboard title="Copy Model JSON" content={JSON.stringify(model, null, 2)} />
          <Action
            title="Save Calculation Snapshot"
            icon={Icon.SaveDocument}
            onAction={async () => {
              saveCalculation("analysis", `${current.template}, ${current.spans} m`, advanced || current);
              await showToast({
                style: Toast.Style.Success,
                title: "Saved with property snapshot",
              });
            }}
          />
        </>
      )}
    </ActionPanel>
  );
  const beforeLast = parseQuick(query.split(",").slice(0, -1).join(","), library);
  const choices = beamChoices(query, library, {
    stage: guidance,
    quick: quick!,
    numberKind: pending ? "dimension" : beforeLast.spans || base.spans ? "load" : "span",
    material: current.material,
    section: current.section,
    hasMaterial: confirmed.material,
    hasSection: confirmed.section,
    hasSpan: !!current.spans,
    spanMetres: (() => {
      try {
        return Math.max(...spansInput(current.spans));
      } catch {
        return undefined;
      }
    })(),
    hasLoad: !!current.q || !!current.pointValue || !!current.jointLoad,
    point: !!current.pointValue,
    roof: ["roof", "inclined"].includes(current.template),
  });
  const selectedID =
    selected === "auto"
      ? choices.length &&
        (!result || guidance.kind !== "ready" || (!!query.split(",").at(-1)?.trim() && choices[0].replace))
        ? choiceID(choices[0])
        : result
          ? "results"
          : "guidance"
      : selected;
  return (
    <List
      isShowingDetail
      filtering={false}
      selectedItemId={selectedID}
      onSelectionChange={(id) => setSelected(id || "results")}
      searchText={query}
      onSearchTextChange={(s) => {
        setQuery(s);
        setSelected("auto");
        if (s) setAdvanced(undefined);
      }}
      searchBarPlaceholder={systemExample(current.template)}
      navigationTitle="Structures / Beam"
      actions={actions}
      searchBarAccessory={
        <List.Dropdown
          id="beam-support-system"
          storeValue={false}
          tooltip="Support system"
          value={current.template}
          onChange={(value) => {
            if (!(value in templateNames) || value === current.template) return;
            const canonical: Record<string, string> = {
              simple: "simply",
              roof: "rafter",
              inclined: "angled",
            };
            const remaining = query
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t && !parseQuick(t, library).template);
            setQuery([canonical[value] || value, ...remaining].join(", ") + ", ");
            setAdvanced(undefined);
            setSelected("auto");
          }}
        >
          {Object.entries(templateNames)
            .sort(([a], [b]) => Number(b === current.template) - Number(a === current.template))
            .map(([value, title]) => (
              <List.Dropdown.Item key={value} value={value} title={title} />
            ))}
        </List.Dropdown>
      }
    >
      {!result && (
        <List.Item
          id="guidance"
          title={guidance.title}
          icon={Icon.ArrowRight}
          detail={<List.Item.Detail markdown={previewMarkdown(intro)} />}
          actions={
            <ActionPanel>
              {guidance.value && (
                <Action
                  title={"Use " + guidance.value}
                  onAction={() => acceptSuggestion(guidance.value!, guidance.replace)}
                />
              )}
              <Action
                title="Edit All Inputs"
                onAction={() => push(<ModelEditor config={current} library={library} onApply={apply} />)}
              />
            </ActionPanel>
          }
        />
      )}
      {!result &&
        !choices.length &&
        stageExamples(guidance.kind, current.template, guidance.value).map((example) => (
          <List.Item
            key={example.value}
            id={"suggest-" + example.value}
            title={example.value}
            subtitle={example.label}
            detail={<List.Item.Detail markdown={previewMarkdown(intro)} />}
            actions={
              <ActionPanel>
                <Action
                  title={"Use " + example.value}
                  onAction={() => acceptSuggestion(example.value, guidance.replace)}
                />
              </ActionPanel>
            }
          />
        ))}
      {result && guidance.kind !== "ready" && (
        <List.Item
          id="hint"
          title={shortLabel}
          subtitle={undefined}
          detail={<List.Item.Detail markdown={previewMarkdown(markdown)} />}
          actions={actions}
        />
      )}
      {result && (
        <List.Item
          id="results"
          title="Overview"
          icon={Icon.LineChart}
          subtitle={result ? templateNames[current.template] : problem}
          detail={<List.Item.Detail markdown={previewMarkdown(markdown)} />}
          actions={actions}
        />
      )}
      {result && <EnlargeDiagramRow markdown={fullViewMarkdown} title={systemName} />}
      {choiceRows(choices, markdown, (c) => acceptSuggestion(c.value, c.replace, c.commit !== false), library, {
        currentFirst: true,
      })}
      {result &&
        model &&
        [
          ...(["M", "V", "N", "v"] as ResponseKey[]).filter((key) => activeResponse(result!, key)),
          ...(!activeResponse(result!, "v") && activeResponse(result!, "globalZ") ? ["globalZ" as const] : []),
          ...(sectionStresses(model!, result!, current.section, current.axis) ? ["stresses" as const] : []),
          "reactions" as const,
        ].map((key) => (
          <List.Item
            key={key}
            id={"response-" + key}
            title={
              key === "stresses"
                ? "Section stresses"
                : key === "reactions"
                  ? "Support reactions"
                  : (
                      {
                        M: "Bending moment",
                        V: "Shear force",
                        N: "Axial force",
                        v: "Deflection",
                        globalZ: "Vertical displacement",
                      } as Record<string, string>
                    )[key]
            }
            detail={
              <List.Item.Detail
                markdown={inputHelp + resultMarkdown(model!, result!, advanced ? undefined : current, key)}
              />
            }
            actions={actions}
          />
        ))}
      <List.Section title="Structures">
        <List.Item
          title="Section properties"
          subtitle="Area, inertia and moduli"
          actions={
            <ActionPanel>
              <Action
                title="Open Section Calculator"
                onAction={() =>
                  push(
                    <FormulaCalculator
                      formula={formulas.find((f) => f.id === "properties")!}
                      initial={{
                        material: current.material,
                        section: current.section,
                        values: {},
                        overrides: {},
                      }}
                      library={library}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Stress calculator"
          subtitle="Axial, bending and shear"
          actions={
            <ActionPanel>
              <Action
                title="Open Stress Calculator"
                onAction={() =>
                  push(
                    <FormulasCommand
                      initialGroup="Stresses"
                      initialSection={current.section}
                      initialMaterial={current.material}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Quick formulas"
          subtitle="Axial extension and Euler load"
          actions={
            <ActionPanel>
              <Action
                title="Open Quick Formulas"
                onAction={() =>
                  push(<FormulasCommand initialSection={current.section} initialMaterial={current.material} />)
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Formula reference"
          subtitle="Standard cases and equations"
          actions={
            <ActionPanel>
              <Action
                title="Open Formula Reference"
                onAction={() =>
                  push(<ReferenceLibrary initialMaterial={current.material} initialSection={current.section} />)
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Data library"
          subtitle="Materials and sections"
          actions={
            <ActionPanel>
              <Action title="Open Data Library" onAction={() => push(<LibraryCommand />)} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Item
        id="edit"
        title="Parameters"
        subtitle="Geometry, material and loads"
        icon={Icon.Pencil}
        detail={
          <List.Item.Detail
            markdown={
              model
                ? `# Model\n\n![Model and loads](${systemDrawing(model, current.section, true)})\n\n${modelLoadList(model)}\n\n${model.nodalLoads.map((l) => `- Node ${l.node}: X ${l.fx} N, Z ${l.fz} N, moment ${l.moment} N·mm`).join("\n")}\n\nPress Enter to edit inputs.`
                : intro
            }
          />
        }
        actions={actions}
      />
      {!config && !query && !advanced && (
        <List.Section title="Start from a system">
          {[
            {
              title: "Simply supported",
              template: "simple",
              spans: "6",
              pitch: "0",
            },
            {
              title: "Continuous",
              template: "continuous",
              spans: "4/5/4/5/4",
              pitch: "0",
            },
            {
              title: "Inclined beam",
              template: "inclined",
              spans: "5",
              pitch: "25",
            },
            {
              title: "Roof frame",
              template: "roof",
              spans: "8",
              pitch: "30",
            },
            {
              title: "Truss",
              template: "truss",
              spans: "8",
              pitch: "30",
            },
          ].map((e) => (
            <List.Item
              key={e.title}
              title={e.title}
              icon={Icon.Play}
              detail={
                <List.Item.Detail
                  markdown={`# ${e.title}\n\nPress Enter to load example inputs. All dimensions, presets and loads remain editable.`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Load Example"
                    onAction={() =>
                      apply({
                        ...base,
                        template: e.template as Template,
                        spans: e.spans,
                        pitch: e.pitch,
                        q: e.template === "truss" ? "0" : "-3",
                        basis: e.template === "inclined" ? "projected" : "member",
                        jointLoad: e.template === "truss" ? "-10" : "",
                      })
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
