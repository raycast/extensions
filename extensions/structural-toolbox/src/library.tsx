import { FormulaCalculator } from "./formula-command";
import { formulas } from "./core/formulas";
import { sectionPropertyValues, optionalSectionPropertyFields } from "./core/section-properties";
import { sectionPropertiesMarkdown } from "./ui/section-properties";
import { ViewActions, previewMarkdown } from "./ui/view-actions";
import { sectionNames, sectionEquations } from "./ui/equations";
import { cleanSectionName, cleanMaterialName } from "./core/smart-choices";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { join } from "node:path";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { parseCSV, writeCSV } from "./core/csv";
import { fuzzyScore, propertyUnit, pendingDataNotice } from "./core/library";
import { sectionFromRow, customSection } from "./core/sections";
import { Material, RecordRow, Section, Shape } from "./core/types";
import { useLibrary, rememberSelection, fmt, libraryDirectory } from "./ui/state";
import { sectionDrawing } from "./ui/drawings";
import { CSVActions, CSVFilesView, LibraryError, reportError } from "./ui/common";
import Formulas from "./formulas";
import Analysis from "./analysis";
import { parseSection } from "./core/input";
function propertyRows(item: Material | Section, filter: string) {
  const isMaterial = "E" in item;
  const data: Record<string, unknown> = isMaterial
    ? { ...item.raw, E: item.E, G: item.G, density: item.density }
    : {
        ...item.raw,
        A: item.A,
        Iy: item.Iy,
        Iz: item.Iz,
        Wy: item.Wy,
        Wz: item.Wz,
        ry: item.ry,
        rz: item.rz,
        J: item.J,
        Wply: item.Wply,
        Wplz: item.Wplz,
        Iyz: item.Iyz,
        Imajor: item.Imajor,
        Iminor: item.Iminor,
        principalAngle: item.principalAngle,
        cy: item.cy,
        cz: item.cz,
        Ay: item.Ay,
        Az: item.Az,
        Iw: item.Iw,
      };
  const excluded = ["id", "family", "shape", "source", "standard", "notes", "status", "group"];
  const f = filter.toLowerCase();
  return Object.entries(data)
    .filter(
      ([k, v]) =>
        !excluded.includes(k) &&
        v !== undefined &&
        v !== null &&
        v !== "" &&
        (f === "" ||
          f === "all" ||
          (f === "e"
            ? /^e/i.test(k)
            : f === "density"
              ? /rho|density/i.test(k)
              : k.toLowerCase() === f || k.toLowerCase().includes(f))),
    )
    .map(
      ([k, v]) =>
        `| ${k} | ${sectionNames[k] || k.replace(/_/g, " ")} | ${v === null || v === "" ? "Unavailable" : typeof v === "number" ? fmt(v) : String(v).replace(/\|/g, "/")} | ${propertyUnit(k)} |`,
    )
    .join("\n");
}
function materialMarkdown(m: Material, filter = "") {
  return `**${m.id}**\n\n${pendingDataNotice(m.id) ? `**${pendingDataNotice(m.id)}**\n\n` : ""}\nExample: C24 (material), E (property). Type C24, E.\n${m.family}, ${m.status}\n\n| Symbol | Meaning | Value | Unit |\n|---|---|---:|---|\n${propertyRows(m, filter)}\n\n**Source:** ${m.source}\n\n${m.raw.notes || ""}\n\n${m.status === "TEMPLATE" ? "Template: complete before calculation." : m.status === "VERIFY" ? "Source record is marked VERIFY; confirm product applicability." : ""}`;
}
function sectionMarkdown(s: Section, filter = "") {
  const term = filter.toLowerCase(),
    property =
      term && term !== "all"
        ? sectionPropertyValues(s).find((p) => p.key.toLowerCase() === term || p.symbol.toLowerCase() === term)
        : undefined;
  if (!filter || term === "all" || property) return sectionPropertiesMarkdown(s, "all", property?.key, false);
  return `**${s.id}**\n\n![Section](${sectionDrawing(s)})\n\n| Symbol | Meaning | Value | Unit |\n|---|---|---:|---|\n${propertyRows(s, filter)}\n\nSource: ${s.source}`;
}

function saveRow(file: string, row: RecordRow, original?: string) {
  const path = join(libraryDirectory(), file),
    rows = parseCSV(readFileSync(path, "utf8"));
  if (rows.some((r) => r.id.toLowerCase() === row.id.toLowerCase() && r.id !== original))
    throw Error("That ID already exists. Choose another.");
  const index = rows.findIndex((r) => r.id === original);
  if (index >= 0) rows[index] = row;
  else rows.push(row);
  const tmp = path + ".tmp";
  writeFileSync(tmp, writeCSV(rows));
  renameSync(tmp, path);
}
function MaterialEditor({ item, reload }: { item?: Material; reload: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={item ? "Edit material" : "New custom material"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Material"
            onSubmit={async (v: {
              id: string;
              family: string;
              E: string;
              G: string;
              density: string;
              extra: string;
            }) => {
              try {
                const extras = JSON.parse(v.extra) as RecordRow;
                if (!v.id.trim()) throw Error("Enter a unique ID");
                for (const [k, s] of Object.entries({
                  E: v.E,
                  G: v.G,
                  density: v.density,
                }))
                  if (s && !(Number(s) > 0)) throw Error(`${k} must be positive or blank`);
                const row = {
                  ...Object.fromEntries(Object.entries(extras).map(([k, x]) => [k, String(x ?? "")])),
                  id: v.id.trim(),
                  family: v.family,
                  E: v.E,
                  G: v.G,
                  density: v.density,
                  status: "USER",
                };
                saveRow("materials.csv", row, item?.id);
                reload();
                pop();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Material saved",
                });
              } catch (e) {
                reportError(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="ID" defaultValue={item?.id || ""} placeholder="My timber" />
      <Form.TextField id="family" title="Family" defaultValue={item?.family || "Custom"} />
      <Form.TextField id="E" title="E, MPa" defaultValue={String(item?.E ?? "")} />
      <Form.TextField id="G" title="G, MPa" defaultValue={String(item?.G ?? "")} />
      <Form.TextField id="density" title="Density, kg/m³" defaultValue={String(item?.density ?? "")} />
      <Form.TextArea
        id="extra"
        title="Full record, JSON"
        defaultValue={JSON.stringify(item?.raw || { standard: "User supplied", notes: "" }, null, 2)}
        info="All original columns are preserved. Explicit E/G/density fields override legacy E0_mean/G_mean/rho_mean."
      />
    </Form>
  );
}
function SectionEditor({ item, reload }: { item?: Section; reload: () => void }) {
  const { pop } = useNavigation();
  const original = item?.raw || customSection("rectangle", [100, 300]).raw;
  const [shape, setShape] = useState<Shape>(item?.shape || "rectangle");
  const [dims, setDims] = useState<Record<string, string>>(
    Object.fromEntries(["b", "h", "d", "t", "tw", "tf"].map((k) => [k, original[k] || ""])),
  );
  const fields: Record<Shape, string[]> = {
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
  const dimensionNames: Record<string, string> = {
    b: "Width b",
    h: shape === "shs" ? "Side" : "Height h",
    d: "Diameter d",
    t: "Wall thickness t",
    tw: "Web thickness tw",
    tf: "Flange thickness tf",
  };
  let preview = "Enter the required dimensions.";
  try {
    const section = customSection(
      shape,
      fields[shape].map((k) => Number(dims[k])),
    );
    preview = `A = ${fmt(section.A)} mm², Iy = ${fmt(section.Iy)} mm⁴, Iz = ${fmt(section.Iz)} mm⁴`;
  } catch {
    /* Incomplete input */
  }
  return (
    <Form
      navigationTitle="Section dimensions"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Section"
            onSubmit={(v: { id: string; family: string; extra: string }) => {
              try {
                if (!v.id.trim()) throw Error("Enter a section ID");
                const extra = JSON.parse(v.extra) as RecordRow;
                const row: RecordRow = {
                  ...Object.fromEntries(Object.entries(extra).map(([k, x]) => [k, String(x ?? "")])),
                  ...dims,
                  id: v.id.trim(),
                  family: v.family,
                  shape,
                };
                const changed =
                  shape !== original.shape || fields[shape].some((k) => Number(dims[k]) !== Number(original[k] || 0));
                if (changed) {
                  for (const k of [
                    "A",
                    "Iy",
                    "Iz",
                    "Iyz",
                    "Wy",
                    "Wz",
                    "Wply",
                    "Wplz",
                    "J",
                    "Iw",
                    "Ay",
                    "Az",
                    "mass",
                    "cy",
                    "cz",
                    "r",
                    ...optionalSectionPropertyFields,
                  ])
                    delete row[k];
                  row.source = "User geometry";
                  row.notes =
                    "Idealized geometry from edited dimensions; sharp corners. Torsion constant is approximate.";
                }
                sectionFromRow(row);
                saveRow("sections.csv", row, item?.id);
                reload();
                pop();
              } catch (e) {
                reportError(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Section name" defaultValue={item?.id || "My section"} />
      <Form.TextField id="family" title="Family" defaultValue={item?.family || "Custom"} />
      <Form.Dropdown id="shape" title="Shape" value={shape} onChange={(v) => setShape(v as Shape)}>
        {Object.keys(fields).map((k) => (
          <Form.Dropdown.Item key={k} title={k.toUpperCase()} value={k} />
        ))}
      </Form.Dropdown>
      {fields[shape].map((k) => (
        <Form.TextField
          id={k}
          key={k}
          title={dimensionNames[k] + ", mm"}
          value={dims[k]}
          onChange={(v) => setDims((d) => ({ ...d, [k]: v }))}
        />
      ))}
      <Form.Description title="Geometry preview" text={preview} />
      <Form.Description text="Changing geometry removes catalogue property overrides and recalculates an idealized section. Unchanged dimensions retain published properties. CSV edits can supply additional catalogue properties." />
      <Form.TextArea
        id="extra"
        title="Additional record properties, JSON"
        defaultValue={JSON.stringify(
          Object.fromEntries(
            Object.entries(original).filter(
              ([k]) => !["id", "family", "shape", "b", "h", "d", "t", "tw", "tf"].includes(k),
            ),
          ),
          null,
          2,
        )}
      />
    </Form>
  );
}
export default function LibraryCommand(props: { category?: "material" | "section" } = {}) {
  const { library, error, reload } = useLibrary(),
    [query, setQuery] = useState(""),
    [category] = useState(props.category || "material"),
    [family, setFamily] = useState("all"),
    [selected, setSelected] = useState("");
  const { push } = useNavigation();
  if (error) return <LibraryError message={error} reload={reload} />;
  if (!props.category)
    return (
      <List navigationTitle="Structural Library" searchBarPlaceholder="Choose a library">
        <List.Item
          title="Materials"
          subtitle="Timber, steel, concrete"
          icon={Icon.Layers}
          actions={
            <ActionPanel>
              <Action title="Open Materials" onAction={() => push(<LibraryCommand category="material" />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Sections"
          subtitle="Published section and timber-size presets"
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action title="Open Sections" onAction={() => push(<LibraryCommand category="section" />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="CSV Files"
          subtitle={
            library
              ? `${library.materials.length} materials; ${library.sections.length} sections`
              : "Folder, files and loading status"
          }
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action title="Show CSV Files and Path" onAction={() => push(<CSVFilesView onReload={reload} />)} />
            </ActionPanel>
          }
        />
      </List>
    );
  const parts = query.split(",").map((s) => s.trim()),
    propertyNames = ["all", "e", "g", "density", "iy", "iz", "wy", "wz", "a", "j", "mass"];
  let filter = parts[1] || "",
    search = parts[0] || "";
  if (parts.length === 1 && propertyNames.includes(search.toLowerCase())) {
    filter = search;
    search = "";
  }
  let custom: Section | null = null;
  try {
    if (library) custom = parseSection(/^\d+(?:\.\d+)?\s*[x×]/.test(search) ? "rect " + search : search, library);
  } catch {
    /* Incomplete dimensions remain suggestions. */
  }
  const list = (
    library
      ? [
          ...library.materials.map((m) => ({ item: m, type: "material" })),
          ...library.sections.map((s) => ({ item: s, type: "section" })),
        ]
      : []
  )
    .filter(
      (v) =>
        v.type === category &&
        (family === "all" || v.item.family === family) &&
        (v.type !== "material" || (v.item as Material).status !== "TEMPLATE") &&
        (!search || fuzzyScore(search, v.item.id + " " + v.item.family) > 0),
    )
    .sort((a, b) => fuzzyScore(search, b.item.id) - fuzzyScore(search, a.item.id));
  const selectedVisible = list.some(({ item, type }) => selected === type + item.id)
    ? selected
    : list[0]
      ? list[0].type + list[0].item.id
      : "";
  const actions = (item: Material | Section, type: string) => (
    <ActionPanel>
      <Action
        title={type === "section" ? "Open Section Properties" : "Use in Structures Calculator"}
        icon={Icon.Calculator}
        onAction={async () => {
          await rememberSelection(
            type === "material" ? (item as Material) : undefined,
            type === "section" ? (item as Section) : undefined,
          );
          if (type === "section" && library) {
            push(
              <FormulaCalculator
                formula={formulas.find((f) => f.id === "properties")!}
                initial={{
                  material: library.materials[0],
                  section: item as Section,
                  values: {},
                  overrides: {},
                  confirmed: { section: true },
                }}
                library={library}
              />,
            );
            return;
          }
          push(
            <Formulas
              initialGroup={type === "section" ? "Sections" : "Stresses"}
              initialMaterial={type === "material" ? (item as Material) : undefined}
              initialSection={type === "section" ? (item as Section) : undefined}
            />,
          );
        }}
      />
      <Action
        title="Use in Structures Beam"
        icon={Icon.LineChart}
        onAction={async () => {
          await rememberSelection(
            type === "material" ? (item as Material) : undefined,
            type === "section" ? (item as Section) : undefined,
          );
          push(
            <Analysis
              initialMaterial={type === "material" ? (item as Material) : undefined}
              initialSection={type === "section" ? (item as Section) : undefined}
            />,
          );
        }}
      />
      <Action
        title="Edit Record"
        icon={Icon.Pencil}
        onAction={() =>
          push(
            type === "material" ? (
              <MaterialEditor item={item as Material} reload={reload} />
            ) : (
              <SectionEditor item={item as Section} reload={reload} />
            ),
          )
        }
      />
      <Action.CopyToClipboard title="Copy Properties" content={JSON.stringify(item, null, 2)} />
      <Action title="New Material" onAction={() => push(<MaterialEditor reload={reload} />)} />
      <Action title="New Section" onAction={() => push(<SectionEditor reload={reload} />)} />
      <ViewActions
        markdown={
          type === "material" ? materialMarkdown(item as Material, filter) : sectionMarkdown(item as Section, filter)
        }
        title={item.id}
      />
      <CSVActions reload={reload} />
    </ActionPanel>
  );
  return (
    <List
      selectedItemId={selected || undefined}
      onSelectionChange={(id) => setSelected(id || "")}
      isLoading={!library}
      isShowingDetail
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      navigationTitle={category === "material" ? "Materials" : "Sections"}
      searchBarPlaceholder={category === "material" ? "C24, E" : "IPE160, Iy"}
      searchBarAccessory={
        <List.Dropdown tooltip="Family" value={family} onChange={setFamily}>
          <List.Dropdown.Item title="All families" value="all" />
          {[
            ...new Set(
              (category === "material" ? library?.materials || [] : library?.sections || []).map((x) => x.family),
            ),
          ]
            .sort()
            .map((f) => (
              <List.Dropdown.Item key={f} title={f} value={f} />
            ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="New Material" onAction={() => push(<MaterialEditor reload={reload} />)} />
          <Action title="New Section" onAction={() => push(<SectionEditor reload={reload} />)} />
          <CSVActions reload={reload} />
        </ActionPanel>
      }
    >
      {category === "section" && custom && !library?.sections.some((s) => s.id === custom!.id) && (
        <List.Item
          title={custom.id}
          subtitle="Entered dimensions"
          icon={Icon.Plus}
          detail={<List.Item.Detail markdown={sectionMarkdown(custom, filter)} />}
          actions={actions(custom, "section")}
        />
      )}
      {category === "section" && !search && family === "all"
        ? [...new Set(library?.sections.map((s) => s.family) || [])].map((f) => (
            <List.Item
              key={f}
              id={"family-" + f}
              title={f}
              subtitle="Choose sizes"
              icon={Icon.Box}
              detail={
                <List.Item.Detail
                  markdown={`**${f} sections**\n\nChoose this family to browse sizes, or type a section name directly, such as HEB200, SHS100x100x5 or 100x200. New CSV families appear here automatically.`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={"Browse " + f}
                    onAction={() => {
                      setFamily(f);
                      setSelected("");
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
        : list.map(({ item, type }, index) => (
            <List.Item
              key={type + item.id}
              id={type + item.id}
              title={type === "section" ? cleanSectionName(item as Section) : cleanMaterialName(item as Material)}
              subtitle={undefined}
              icon={type === "material" ? Icon.Layers : Icon.Box}
              accessories={type === "material" ? [{ text: (item as Material).status }] : []}
              detail={
                <List.Item.Detail
                  markdown={
                    selectedVisible === type + item.id
                      ? type === "material"
                        ? materialMarkdown(item as Material, filter)
                        : sectionMarkdown(item as Section, filter)
                      : item.id
                  }
                />
              }
              actions={actions(item, type)}
            />
          ))}
      <List.EmptyView
        title={category === "material" ? "Find a material" : "Find a section"}
        description={
          category === "material"
            ? "Try C30/37, C24, E or steel. Use Actions to add a material."
            : "Try IPE200, Iy or rect 100x300. Use Actions to add a section."
        }
      />
    </List>
  );
}
