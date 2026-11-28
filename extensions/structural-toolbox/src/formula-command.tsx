import { engineeringIDs } from "./core/engineering-input";
import { engineeringMarkdown, columnFYI, engineeringDetailViews } from "./ui/stability-torsion";
import { EngineeringFields, readEngineeringOptions } from "./ui/engineering-options";
import { materialStrength, isSteel } from "./core/stability-torsion";
import { propertyGroups, PropertyGroup, sectionPropertyValues } from "./core/section-properties";
import { sectionPropertiesMarkdown } from "./ui/section-properties";
import { ViewActions, previewMarkdown, EnlargeDiagramRow } from "./ui/view-actions";
import { formulaStage, formulaChoices, FormulaStage, formulaInputName } from "./core/formula-flow";
import { formulaOverview } from "./ui/formula-overview";
import { smartChoices, preferredMaterial, choiceID } from "./core/smart-choices";
import { choiceRows } from "./ui/choices";
import { equation, formulaTex, sectionNames, sectionEquations } from "./ui/equations";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { formulas, Formula, FormulaValues, calculate } from "./core/formulas";
import { Library, fuzzyScore, usableMaterial, pendingDataNotice } from "./core/library";
import { parseQuick, parseSection, pointLocation } from "./core/input";
import { parseFormulaInput, formulaScalar, inputUnit, displayInput, FormulaInput } from "./core/formula-input";
import { Material, Section } from "./core/types";
import {
  defaultMaterial,
  defaultSection,
  fmt,
  rememberSelection,
  saveCalculation,
  savedCalculations,
  useLibrary,
} from "./ui/state";
import { formulaDrawing } from "./ui/drawings";
import { LibraryError, reportError } from "./ui/common";
import Analysis from "./analysis";
import { formulaExample, formulaPrimaryInputs } from "./core/formula-examples";
import { formulaCatalog } from "./core/formula-catalog";
import { formulaLabel, formulaSearchScore } from "./core/formula-presentation";
interface Props {
  initialGroup?: string;
  initialMaterial?: Material;
  initialSection?: Section;
}
interface Context {
  material: Material;
  section: Section;
  values: Partial<FormulaValues>;
  overrides: Partial<FormulaValues>;
  confirmed?: { material?: boolean; section?: boolean };
}
const names: Record<string, string> = {
  L: "Span",
  P: "Point / shear force",
  q: "Distributed load",
  E: "Elastic modulus",
  I: "Second moment of area",
  A: "Area",
  W: "Section modulus",
  N: "Axial force",
  M: "Bending moment",
  K: "Effective-length factor",
  a: "Position / fibre distance",
};
function merged(c: Context, f: Formula): FormulaValues {
  const v: FormulaValues = {
    L: NaN,
    P: NaN,
    q: NaN,
    E: c.material.E ?? NaN,
    G: c.material.G ?? NaN,
    material: c.material,
    I: f.id === "euler" ? c.section.Iminor : c.section.Iy,
    A: c.section.A,
    W: c.section.Wy,
    N: NaN,
    M: NaN,
    K: 1,
    a: NaN,
    section: c.section,
    ...c.values,
    ...c.overrides,
    eulerAboutSection: f.id === "euler" && c.overrides.I === undefined && c.values.I === undefined,
  };
  if (c.values.a === undefined && c.overrides.a === undefined)
    v.a = f.id === "modulus" ? c.section.h / 2 : f.id === "torsion-warping" && (v.torqueCase ?? 0) < 2 ? v.L : v.L / 2;
  return v;
}
const primaryInputs = formulaPrimaryInputs;
function formulaPrompt(f: Formula) {
  return formulaExample(f);
}
function missingPrompt(f: Formula, c: Context) {
  const v = merged(c, f),
    keys = primaryInputs(f).filter((k) => !Number.isFinite(v[k] as number));
  if (!keys.length) return formulaPrompt(f);
  const example: Record<string, string> = {
    L: "6m",
    P: "10kN",
    q: "3kN/m",
    M: "M=20kNm",
    T: "T=1kNm",
    N: "N=10kN",
  };
  return `Enter ${keys.map((k) => formulaInputName(f, k).toLowerCase()).join(" and ")}, for example ${keys.map((k) => example[k]).join(", ")}`;
}
function geometryText(s: Section) {
  const keys: Record<string, string[]> = {
    rectangle: ["b", "h"],
    circle: ["d"],
    rhs: ["h", "b", "t"],
    shs: ["h", "t"],
    chs: ["d", "t"],
    i: ["h", "b", "tw", "tf"],
    t: ["h", "b", "tw", "tf"],
    channel: ["h", "b", "tw", "tf"],
    angle: ["h", "b", "tw", "tf"],
  };
  return s.shape + " " + keys[s.shape].map((k) => s[k as keyof Section]).join("x");
}
function formulaSketch(f: Formula, c: Context, v: FormulaValues, illustrative = false) {
  try {
    return formulaDrawing(f, c.section, v, illustrative);
  } catch {
    return undefined;
  }
}
function formulaMarkdown(
  f: Formula,
  c: Context,
  provided: Set<string> = new Set(),
  errors: string[] = [],
  stage: FormulaStage = formulaStage(f, merged(c, f), provided, c.confirmed),
  propertyGroup: PropertyGroup | "all" = "all",
  propertyKey?: string,
) {
  const v = merged(c, f),
    missing = primaryInputs(f).filter((k) => !Number.isFinite(v[k] as number));
  let answers: ReturnType<typeof calculate> = [],
    problem = "";
  try {
    if (errors.length) throw Error(errors.join("; "));
    if (!missing.length && stage.ready) {
      if (f.inputs.includes("E") && c.overrides.E === undefined) usableMaterial(c.material);
      answers = calculate(f, v);
    }
  } catch (e) {
    problem = e instanceof Error ? e.message : String(e);
  }
  if (engineeringIDs.includes(f.id))
    return engineeringMarkdown(f, c.section, c.material, v, answers, problem, stage.title + ". " + stage.hint);
  if (f.id === "properties" && answers.length && !problem)
    return sectionPropertiesMarkdown(c.section, propertyGroup, propertyKey);
  const source = (k: string) =>
    provided.has(k) || c.overrides[k as keyof FormulaValues] !== undefined
      ? "Entered"
      : k === "E"
        ? "Material"
        : k === "a" && f.id !== "modulus"
          ? "Midpoint assumed"
          : ["I", "A", "W", "a", "section"].includes(k)
            ? "Section"
            : "Default";
  const rows = f.inputs
    .filter((k) => k === "section" || Number.isFinite(v[k] as number))
    .map((k) =>
      k === "section"
        ? `| Section | ${c.section.id} | | Section |`
        : `| ${formulaInputName(f, k)} (${k === "a" && f.id === "modulus" ? "c" : k === "P" && f.id === "rect-shear" ? "V" : k}) | ${fmt(displayInput(f, k, v[k] as number))} | ${inputUnit(f, k)} | ${source(k)} |`,
    )
    .join("\n");
  const overview = formulaOverview(f, c.section, c.material, v, answers, stage, provided, problem);
  const result =
    answers.length === 1
      ? `**${fmt(answers[0].value)} ${answers[0].unit}** — ${answers[0].label}`
      : answers.length
        ? `| Symbol | Meaning | Value |\n|---|---|---:|\n${answers.map((a) => `| ${a.label} | ${sectionNames[a.label] || a.label} | **${fmt(a.value)} ${a.unit}** |`).join("\n")}`
        : "";
  let worked = "";
  if (answers.length && f.group === "Stresses") {
    const tex =
      f.id === "axial-stress"
        ? `\\sigma=\\frac{${v.N}}{${v.A}}`
        : f.id === "bending-stress"
          ? `|\\sigma|=\\frac{${Math.abs(v.M)}}{${v.W}}`
          : `\\tau_{max}=\\frac{3\\times ${Math.abs(v.P)}}{2\\times ${v.A}}`;
    worked = equation(tex + `=${fmt(answers[0].value).replace(/,/g, "")}\\,\\mathrm{MPa}`) + "\n\n";
  }
  if (f.id === "properties" && c.section.shape === "rectangle")
    worked =
      equation(
        `I_y=\\frac{bh^3}{12}=\\frac{${c.section.b}\\times ${c.section.h}^3}{12}=${c.section.Iy}\\,\\mathrm{mm}^4`,
      ) + "\n\n";
  const fyi = f.id === "euler" && answers.length && !problem ? columnFYI(c.section, c.material, v) : "";
  return `**${f.title}**\n\n![Calculator overview: result, equation and sketch](${overview})\n\n${problem ? `**Check input:** ${problem}\n\n` : !stage.ready ? `**Next: ${stage.title}**\n\n${stage.hint}\n\n${missing.length ? "Missing: " + missing.map((k) => formulaInputName(f, k).toLowerCase()).join(" and ") + ".\n\n" : ""}` : ""}${result}\n\n${fyi}\n\n${answers.length ? "**Worked calculation**\n\n" + worked : ""}${f.id === "properties" && answers.length ? sectionEquations(c.section.shape) : ""}\n\n${answers
    .filter((a) => a.substitution)
    .map((a) => a.substitution)
    .join(
      "\n\n",
    )}\n\n${stage.ready && rows ? `**Current inputs**\n\n| Parameter | Value | Unit | Source |\n|---|---:|---|---|\n${rows}\n\n` : ""}${f.inputs.includes("E") && stage.ready && provided.has("material") ? `Material: **${c.material.id}**\n\n${pendingDataNotice(c.material.id)}` : ""}${stage.needsSection && stage.ready && provided.has("section") ? `Section: **${c.section.id}**\n\n` : ""}${f.note}\n\nUse the choices below, or type comma-separated values. Enter accepts the highlighted choice. Custom material, geometry and property overrides are available in Edit Inputs.`;
}
function FormulaEditor({
  formula: f,
  context: c,
  library,
  onApply,
}: {
  formula: Formula;
  context: Context;
  library: Library;
  onApply: (c: Context) => void;
}) {
  const { pop } = useNavigation(),
    [materialID, setMaterialID] = useState(
      library.materials.some((m) => m.id === c.material.id) ? c.material.id : "__custom",
    ),
    [sectionID, setSectionID] = useState(
      library.sections.some((s) => s.id === c.section.id) ? c.section.id : "__custom",
    );
  const mat = library.materials.find((m) => m.id === materialID) || c.material,
    sec = library.sections.find((s) => s.id === sectionID) || c.section,
    values = merged({ ...c, material: mat, section: sec }, f);
  const needSection = f.inputs.some((k) => ["section", "I", "A", "W"].includes(k)),
    needMaterial = f.inputs.includes("E");
  return (
    <Form
      navigationTitle={f.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Calculate"
            onSubmit={(form: Record<string, string>) => {
              try {
                let section = sec,
                  material = mat;
                if (needSection && sectionID === "__custom") {
                  const parsed = parseQuick(form.geometry, library);
                  section = parsed.section || parseSection(form.geometry, library)!;
                  if (!section) throw Error("Enter geometry, e.g. rhs 200x100x6 or rect 100x300");
                }
                const overrides: Partial<FormulaValues> = readEngineeringOptions(f, form, (k, t) =>
                  formulaScalar(f, k, t),
                );
                for (const k of f.inputs) {
                  if (k === "section") continue;
                  const raw = form[k]?.trim();
                  if (raw && !(k === "a" && f.id !== "modulus" && /[%l]/i.test(raw)))
                    (overrides as Record<string, number>)[k] = formulaScalar(f, k, raw);
                }
                if (f.inputs.includes("a") && f.id !== "modulus" && form.a && /[%l]/i.test(form.a)) {
                  const loc = pointLocation(form.a),
                    L = overrides.L ?? c.overrides.L ?? c.values.L;
                  if (!Number.isFinite(L)) throw Error("Enter span before using a position ratio");
                  overrides.a = L! * loc.ratio!;
                }
                if (needMaterial && materialID === "__custom") {
                  const E = overrides.E;
                  if (!(E! > 0)) throw Error("Custom material requires E");
                  for (const key of ["customG", "customDensity"])
                    if (form[key] && !(Number.isFinite(Number(form[key])) && Number(form[key]) > 0))
                      throw Error("Custom G and density must be positive numbers");
                  material = {
                    id: form.materialName || "User material",
                    family: "Custom",
                    E: E!,
                    G: overrides.G ?? (form.customG ? Number(form.customG) : null),
                    density: form.customDensity ? Number(form.customDensity) : null,
                    status: "USER",
                    source: "Calculator input",
                    raw: {
                      id: form.materialName || "User material",
                      E: String(E),
                      family: "Custom",
                    },
                  };
                }
                const next = {
                  material,
                  section,
                  values: { ...c.values },
                  overrides,
                  confirmed: { material: needMaterial, section: needSection },
                };
                if (f.inputs.includes("E") && overrides.E === undefined) usableMaterial(material);
                calculate(f, merged(next, f));
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
      <Form.Description title="Equation" text={f.equation} />
      {needSection && (
        <>
          <Form.Dropdown id="sectionPreset" title="Section" value={sectionID} onChange={setSectionID}>
            <Form.Dropdown.Item title="Enter custom geometry…" value="__custom" />
            {library.sections.map((s) => (
              <Form.Dropdown.Item key={s.id} title={s.id} value={s.id} />
            ))}
          </Form.Dropdown>
          {sectionID === "__custom" && (
            <Form.TextField
              id="geometry"
              title="Geometry in mm"
              defaultValue={geometryText(c.section)}
              placeholder="rhs 200x100x6"
              info="Rectangle b×h; RHS h×b×t; circle diameter; CHS diameter×t. No library record is created."
            />
          )}
        </>
      )}
      {needMaterial && (
        <>
          <Form.Dropdown id="materialPreset" title="Material" value={materialID} onChange={setMaterialID}>
            <Form.Dropdown.Item title="Enter custom material…" value="__custom" />
            {library.materials
              .filter((m) => m.status !== "TEMPLATE" && !["CLT", "Panel"].includes(m.family))
              .map((m) => (
                <Form.Dropdown.Item key={m.id} title={`${m.id}, ${m.family}`} value={m.id} />
              ))}
          </Form.Dropdown>
          {materialID === "__custom" && (
            <>
              <Form.TextField id="materialName" title="Material name" defaultValue="My material" />
              <Form.TextField id="customG" title="G, MPa, optional" />
              <Form.TextField id="customDensity" title="Density, kg/m³, optional" />
            </>
          )}
        </>
      )}
      {f.inputs
        .filter((k) => k !== "section")
        .map((k) => (
          <Form.TextField
            key={k}
            id={k}
            title={`${formulaInputName(f, k)} (${k === "a" && f.id === "modulus" ? "c" : k === "P" && f.id === "rect-shear" ? "V" : k}), ${inputUnit(f, k)}`}
            defaultValue={
              c.overrides[k] !== undefined
                ? String(displayInput(f, k, c.overrides[k] as number))
                : ["E", "G", "I", "A", "W"].includes(k) || (f.id === "torsion-warping" && k === "a")
                  ? ""
                  : Number.isFinite(values[k] as number)
                    ? String(displayInput(f, k, values[k] as number))
                    : ""
            }
            placeholder={
              Number.isFinite(values[k] as number)
                ? Number.isFinite(values[k] as number)
                  ? String(displayInput(f, k, values[k] as number))
                  : ""
                : "Required"
            }
            info={
              ["E", "G", "I", "A", "W"].includes(k)
                ? "Blank inherits the selected preset or custom geometry. Enter a value to override it."
                : "Units are shown in the field label. Explicit compatible units are accepted."
            }
          />
        ))}
      <EngineeringFields formula={f} values={values} material={mat} />
      <Form.Description text={f.note} />
    </Form>
  );
}
function SavedFormulaView({ onRestore }: { onRestore: (id: string, c: Context) => void }) {
  const { pop } = useNavigation();
  return (
    <List searchBarPlaceholder="Saved formula calculations">
      {savedCalculations()
        .filter((r) => r.kind === "formula")
        .map((r, j) => (
          <List.Item
            key={j}
            title={r.title}
            subtitle={r.date.slice(0, 16)}
            actions={
              <ActionPanel>
                <Action
                  title="Restore Snapshot"
                  onAction={() => {
                    onRestore(r.input.formula, r.input.context);
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
export function FormulaCalculator({
  formula: f,
  initial,
  library,
  initialQuery = "",
}: {
  initialQuery?: string;
  formula: Formula;
  initial: Context;
  library: Library;
}) {
  const [query, setQuery] = useState(initialQuery),
    [selection, setSelection] = useState("auto"),
    [context, setContext] = useState(() =>
      f.id === "torsion-warping" && initial.section.shape !== "i"
        ? {
            ...initial,
            section: library.sections.find((s) => s.id === "IPE 200") || initial.section,
            material: library.materials.find((m) => m.id === "Steel-S355") || initial.material,
          }
        : initial,
    ),
    [propertyGroup, setPropertyGroup] = useState<PropertyGroup | "all">("all");
  const { push } = useNavigation();
  const parsed = parseFormulaInput(query, f, library, merged(context, f).L),
    active: Context = {
      ...context,
      material: parsed.material || (parsed.section ? preferredMaterial(parsed.section, library) : context.material),
      section: parsed.section || context.section,
      overrides: { ...context.overrides, ...parsed.values },
    };
  const explicit = new Set([...Object.keys(context.values), ...Object.keys(context.overrides), ...parsed.provided]);
  if (context.confirmed?.section) explicit.add("section");
  if (context.confirmed?.material) explicit.add("material");
  const stage = formulaStage(f, merged(active, f), explicit, context.confirmed);
  const prefix = query.split(",").slice(0, -1).join(",");
  const prefixParsed = parseFormulaInput(prefix, f, library, merged(context, f).L);
  const prefixContext = {
    ...context,
    overrides: { ...context.overrides, ...prefixParsed.values },
  };
  const prefixExplicit = new Set([
    ...Object.keys(context.values),
    ...Object.keys(context.overrides),
    ...prefixParsed.provided,
  ]);
  const prefixStage = formulaStage(f, merged(prefixContext, f), prefixExplicit, context.confirmed);
  const numberKey =
    prefixStage.key ||
    (prefixStage.kind === "material"
      ? "E"
      : prefixStage.kind === "section"
        ? f.inputs.find((k) => ["I", "A", "W"].includes(k))
        : undefined);
  const choices = formulaChoices(query, f, library, {
    stage,
    material: active.material,
    section: active.section,
    parsed,
    values: merged(active, f),
    explicit,
    numberKey,
  });
  if (stage.ready && (f.id === "euler" || f.id === "ltb") && isSteel(active.material)) {
    const strength = materialStrength(active.material, merged(active, f));
    if (strength.fy === undefined && strength.nominalFy)
      choices.unshift({
        title: `fy = ${strength.nominalFy} MPa`,
        value: `fy=${strength.nominalFy}MPa`,
        group: "Optional EC3 factors — confirm strength",
        hint: "Nominal grade; confirm product/thickness",
        commit: true,
        replace: false,
      });
  }
  const tail = query.split(",").at(-1)?.trim() || "";
  const searching = !!tail && parsed.errors.length && choices.length;
  const properties = f.id === "properties" && stage.ready ? sectionPropertyValues(active.section) : [];
  const availableGroups = propertyGroups.filter((g) => properties.some((p) => p.group === g));
  const activePropertyGroup =
    propertyGroup === "all" || availableGroups.includes(propertyGroup) ? propertyGroup : "all";
  const selectedProperty = properties.find((p) => selection === "property-" + p.key);
  const markdown = formulaMarkdown(
    f,
    active,
    explicit,
    searching ? [] : parsed.errors,
    stage,
    activePropertyGroup,
    selectedProperty?.key,
  );
  const options = choiceRows(
    choices,
    markdown,
    (c) => {
      setSelection("auto");
      const parts = query.split(",").map((s) => s.trim());
      if (c.replace) parts.pop();
      const prefix = parts.filter(Boolean).join(", ");
      setQuery((prefix ? prefix + ", " : "") + c.value + (c.commit === false ? "" : ", "));
    },
    library,
    {
      currentFirst: true,
      compactDetails: true,
      preview: (section, material) =>
        section || material
          ? (stage.ready ? "**Preview of suggested option; Enter applies it.**\n\n" : "") +
            formulaMarkdown(
              f,
              {
                ...active,
                section: section || active.section,
                material: material || active.material,
              },
              explicit,
              [],
              stage,
            )
          : markdown,
    },
  );
  return (
    <List
      navigationTitle={f.title}
      selectedItemId={
        selection === "auto"
          ? choices.length && (!stage.ready || !!searching)
            ? choiceID(choices[0])
            : "calculation"
          : selection
      }
      onSelectionChange={(id) => setSelection(id || "auto")}
      isShowingDetail
      filtering={false}
      searchText={query}
      onSearchTextChange={(s) => {
        setQuery(s);
        setSelection("auto");
      }}
      searchBarPlaceholder={formulaExample(f)}
      searchBarAccessory={
        f.id === "properties" && stage.ready ? (
          <List.Dropdown
            tooltip="Property category"
            value={activePropertyGroup}
            onChange={(value) => {
              if (value === "all" || availableGroups.includes(value as PropertyGroup)) {
                setPropertyGroup(value as PropertyGroup | "all");
                setSelection("calculation");
              }
            }}
          >
            <List.Dropdown.Item title="All properties" value="all" />
            {availableGroups.map((group) => (
              <List.Dropdown.Item key={group} title={group} value={group} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {!stage.ready && options}
      <List.Item
        id="calculation"
        title={stage.ready ? "Overview" : "Inputs and equation"}
        subtitle={stage.ready ? formulaLabel(f).title : stage.title}
        icon={Icon.Calculator}
        detail={<List.Item.Detail markdown={previewMarkdown(markdown)} />}
        actions={
          <ActionPanel>
            {stage.ready && <ViewActions markdown={markdown} title={f.title} />}
            <Action
              title="Edit Inputs / Custom Geometry"
              icon={Icon.Pencil}
              onAction={() =>
                push(
                  <FormulaEditor
                    formula={f}
                    context={active}
                    library={library}
                    onApply={(c) => {
                      setContext(c);
                      setQuery("");
                    }}
                  />,
                )
              }
            />
            {f.beam && (
              <>
                <Action
                  title="Use in Structural Analysis"
                  onAction={() => {
                    const v = merged(active, f);
                    try {
                      calculate(f, v);
                      push(
                        <Analysis
                          initialMaterial={active.material}
                          initialSection={active.section}
                          initialFormula={f}
                          initialValues={v}
                          initialEOverride={active.overrides.E}
                        />,
                      );
                    } catch (e) {
                      reportError(e);
                    }
                  }}
                />
              </>
            )}
            {!stage.ready && <ViewActions markdown={markdown} title={f.title} />}
            <Action.CopyToClipboard title="Copy Calculation" content={markdown} />
            <Action
              title="Save Calculation"
              onAction={() => {
                try {
                  if (parsed.errors.length) throw Error(parsed.errors.join("; "));
                  if (!stage.ready) throw Error(stage.title);
                  calculate(f, merged(active, f));
                  saveCalculation("formula", f.title, {
                    formula: f.id,
                    context: active,
                  });
                  showToast({
                    style: Toast.Style.Success,
                    title: "Calculation saved",
                  });
                } catch (e) {
                  reportError(e);
                }
              }}
            />
          </ActionPanel>
        }
      />
      {stage.ready && <EnlargeDiagramRow markdown={markdown} title={f.title} />}
      {stage.ready &&
        !parsed.errors.length &&
        engineeringDetailViews(f.id, markdown).map((view, index) => (
          <List.Item
            key={view.title}
            id={"engineering-view-" + index}
            title={view.title}
            icon={Icon.LineChart}
            detail={<List.Item.Detail markdown={previewMarkdown(view.markdown, f.title)} />}
            actions={
              <ActionPanel>
                <ViewActions markdown={view.markdown} title={f.title + " / " + view.title} />
                <Action.CopyToClipboard title="Copy View" content={view.markdown} />
              </ActionPanel>
            }
          />
        ))}
      {stage.ready && options}
      {f.id === "properties" &&
        stage.ready &&
        availableGroups
          .filter((g) => activePropertyGroup === "all" || g === activePropertyGroup)
          .map((group) => (
            <List.Section key={group} title={group}>
              {properties
                .filter((p) => p.group === group)
                .map((p) => {
                  const md = sectionPropertiesMarkdown(active.section, group, p.key);
                  return (
                    <List.Item
                      key={p.key}
                      id={"property-" + p.key}
                      title={p.symbol}
                      subtitle={
                        Math.abs(p.value) >= 1e6 ? p.value.toExponential(3) + " " + p.unit : fmt(p.value) + " " + p.unit
                      }
                      detail={<List.Item.Detail markdown={previewMarkdown(md)} />}
                      actions={
                        <ActionPanel>
                          <Action title="Show Overview" onAction={() => setSelection("calculation")} />
                          <ViewActions markdown={md} title={p.name} />
                          <Action.CopyToClipboard
                            title="Copy Property"
                            content={p.symbol + " = " + p.value + " " + p.unit}
                          />
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
export default function FormulasCommand(props: Props = {}) {
  const { library, error, selection, reload } = useLibrary(),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState(props.initialGroup || "all");
  const { push } = useNavigation();
  if (error) return <LibraryError message={error} reload={reload} />;
  if (!library) return <List isLoading searchText={query} onSearchTextChange={setQuery} />;
  const initial: Context = {
    material: props.initialMaterial || defaultMaterial(library, selection),
    section: props.initialSection || defaultSection(library, selection),
    values: {},
    overrides: {},
  };
  const normalize = (s: string) =>
    s
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const candidates = formulaCatalog.filter(
    (f) => (f.group !== "Beams" || !!query || group === "Beams") && (group === "all" || f.group === group),
  );
  const exact = query
    ? candidates.filter(
        (f) =>
          normalize(f.title).includes(normalize(query)) ||
          normalize(f.equation).includes(normalize(query)) ||
          f.id === query,
      )
    : [];
  const rows = (exact.length ? exact : candidates)
    .map((f) => ({
      f,
      score: formulaSearchScore(query, f),
    }))
    .filter((x) => !query || x.score > 0)
    .sort((a, b) => b.score - a.score);
  return (
    <List
      navigationTitle="Structures / Quick formulas"
      isShowingDetail
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Find a result, for example deflection, moment or section modulus"
      searchBarAccessory={
        <List.Dropdown tooltip="Formula category" value={group} onChange={setGroup}>
          {["all", "Sections", "Stresses", "Deformation", "Beams", "Buckling"].map((g) => (
            <List.Dropdown.Item key={g} title={g === "all" ? "All formulas" : g} value={g} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Open Saved Formulas"
            onAction={() =>
              push(
                <SavedFormulaView
                  onRestore={(id, c) => {
                    const f = formulaCatalog.find((f) => f.id === id) || formulas.find((f) => f.id === id);
                    if (f) push(<FormulaCalculator formula={f} initial={c} library={library} />);
                  }}
                />,
              )
            }
          />
        </ActionPanel>
      }
    >
      {[...new Set(rows.map(({ f }) => formulaLabel(f).group))].map((heading) => (
        <List.Section key={heading} title={heading}>
          {rows
            .filter(({ f }) => formulaLabel(f).group === heading)
            .map(({ f }) => (
              <List.Item
                key={f.id}
                id={f.id}
                title={formulaLabel(f).title}
                subtitle={formulaLabel(f).subtitle}
                icon={Icon.Calculator}
                detail={
                  <List.Item.Detail
                    markdown={`**${f.title}**\n\n${formulaSketch(f, initial, merged(initial, f), true) ? `![Section, loading and result preview](${formulaSketch(f, initial, merged(initial, f), true)})\n\n` : ""}**Output:** ${f.title.split(" — ")[0]}\n\n**Equation:**\n\n${equation(formulaTex(f.id, f.equation))}\n\n${f.id === "properties" ? sectionEquations(initial.section.shape) : ""}\n\nType: **${formulaPrompt(f)}**\n\n${formulaExample(f, true)}. Parentheses explain values; type values only.\n\n${f.beam === "continuous" ? "L is each span; the point case loads the first span only.\n\n" : ""}${f.inputs.includes("E") ? "Material and section supply stiffness. Both can be changed." : "Only inputs relevant to this result are required."}\n\n**Enter to calculate or edit the section.**\n\n${f.note}`}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Open Calculator"
                      onAction={() => push(<FormulaCalculator formula={f} initial={initial} library={library} />)}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="Find a formula"
        description="Search for the result you need. Enter values after opening a calculator."
      />
    </List>
  );
}
