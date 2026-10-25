import { engineeringSketch } from "./ui/stability-torsion";
import { engineeringIDs } from "./core/engineering-input";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import Analysis from "./analysis";
import Formulas, { FormulaCalculator } from "./formula-command";
import ReferenceLibrary from "./reference-library";
import LibraryCommand from "./library";
import { formulas, FormulaValues } from "./core/formulas";
import { formulaSearchScore, formulaLabel } from "./core/formula-presentation";
import { fuzzyScore } from "./core/library";
import { parseQuick } from "./core/input";
import { useLibrary, defaultMaterial, defaultSection } from "./ui/state";
import { LibraryError } from "./ui/common";
import { formulaDrawing } from "./ui/drawings";
import { equation, formulaTex } from "./ui/equations";
import { formulaExample } from "./core/formula-examples";

/** Navigation belongs to explicit actions, never to dropdown initialization or selection events. */
export default function Structures() {
  const { library, error, selection, reload } = useLibrary();
  const [query, setQuery] = useState("");
  const { push } = useNavigation();
  if (error) return <LibraryError message={error} reload={reload} />;
  if (!library) return <List isLoading navigationTitle="Structures" searchText={query} onSearchTextChange={setQuery} />;
  const material = defaultMaterial(library, selection),
    section = defaultSection(library, selection);
  const initial = { material, section, values: {}, overrides: {} };
  const sample: FormulaValues = {
    L: 6000,
    P: 10000,
    q: 3,
    E: material.E || 11000,
    I: section.Iy,
    A: section.A,
    W: section.Wy,
    N: 10000,
    M: 20e6,
    K: 1,
    a: 3000,
    section,
  };
  const beamExample = formulaDrawing(
    formulas.find((f) => f.id === "ss-udl")!,
    section,
    sample,
    true,
  );
  const quick = parseQuick(query, library);
  const directInput = !!query.trim() && (query.includes(",") || /^\s*\d.*(?:m|n|[x×])/i.test(query));
  const sectionInput = directInput && !!quick.section && !quick.spans && quick.P === undefined && quick.q === undefined;
  const openFormula = (id: string, input = "") =>
    push(
      <FormulaCalculator
        formula={formulas.find((f) => f.id === id)!}
        initial={initial}
        library={library}
        initialQuery={input}
      />,
    );
  const rows = [
    {
      id: "beam",
      title: "Beam and frame",
      group: "Calculate",
      search: "beam analysis simply cantilever fixed continuous rafter inclined truss",
      subtitle: "Loads, forces and deflection",
      detail: `**Beam and frame**\n\nSimply supported, cantilever, fixed ends, continuous spans, inclined beams and roof rafters.\n\n**Enter to open.** Example input: **simply, 6m, 3kN/m, C24, 100x300**.\n\n![Illustrative beam and section](${beamExample})\n\nIllustration only. Results require your span and load. The calculator shows reactions, forces, stresses and bending + shear deformation where available.`,
      open: () => push(<Analysis initialMaterial={material} initialSection={section} />),
      score: 0,
    },
    ...[
      "torsion-sv",
      "torsion-warping",
      "ltb",
      "axial-stress",
      "bending-stress",
      "rect-shear",
      "axial-deformation",
      "euler",
      "properties",
      "radius",
    ].map((id) => {
      const f = formulas.find((f) => f.id === id)!,
        v = {
          ...sample,
          I: id === "euler" ? section.Iminor : section.Iy,
          a: id === "modulus" ? section.h / 2 : sample.a,
        };
      return {
        id,
        title: formulaLabel(f).title,
        group: f.group === "Sections" ? "Sections" : "Calculate",
        search: f.title,
        subtitle: (
          {
            "torsion-sv": "Torque, stress and twist",
            "torsion-warping": "Torque split and stresses",
            ltb: "Mcr and material factors",
            "axial-stress": "N / A",
            "bending-stress": "M / W",
            "rect-shear": "3V / (2A)",
            "axial-deformation": "NL / (EA)",
            euler: "π²EI / (KL)²",
            properties: "All geometric properties",
            modulus: "I / c",
            radius: "√(I / A)",
          } as Record<string, string>
        )[id],
        detail: `**${formulaLabel(f).title}**\n\n${equation(formulaTex(f.id, f.equation))}\n\n**Enter to open this calculator.**\n\nExample: **${formulaExample(f)}**.\n\n![Illustration of the calculation](${engineeringIDs.includes(f.id) ? engineeringSketch(f.id, section, v, true) : formulaDrawing(f, section, v, true)})\n\nIllustration only. ${f.note}`,
        open: () => openFormula(id),
        score: formulaSearchScore(query, f),
      };
    }),
    {
      id: "reference",
      title: "Beam case reference",
      group: "Reference and data",
      search:
        "formula reference standard simply supported cantilever fixed continuous point udl triangular temperature",
      subtitle: "92 cases with equations",
      detail:
        "**Beam case reference**\n\nChoose a standard support and load arrangement. See its sketch, reactions, moment, shear, deflection, rotation and equations. Enter to browse the cases.",
      open: () => push(<ReferenceLibrary initialMaterial={material} initialSection={section} />),
      score: 0,
    },
    {
      id: "formulas",
      title: "All formulas",
      group: "Reference and data",
      search: "formula library calculator equations",
      subtitle: "Search every formula",
      detail:
        "**All formulas**\n\nBrowse the scalar calculators and standard beam formulas. Stress, Euler load and gyration-radius calculators remain available. Elastic and plastic section moduli are included in Section properties. Enter to browse.",
      open: () => push(<Formulas initialMaterial={material} initialSection={section} />),
      score: 0,
    },
    {
      id: "data",
      title: "Material and section data",
      group: "Reference and data",
      search: "library materials sections steel timber concrete properties data",
      subtitle: "Presets and editable CSV",
      detail:
        "**Material and section data**\n\nBrowse material grades and section families in separate tables. Enter to open the library.",
      open: () => push(<LibraryCommand />),
      score: 0,
    },
  ]
    .map((r) => ({
      ...r,
      score:
        r.score ||
        Math.max(
          fuzzyScore(query, r.title),
          fuzzyScore(query, r.search),
          ...r.search.split(/\s+/).map((word) => fuzzyScore(query, word)),
        ),
    }))
    .filter((r) => !query.trim() || r.score > 0)
    .sort((a, b) => (query.trim() ? b.score - a.score : 0));
  return (
    <List
      navigationTitle="Structures"
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Find a calculator: stress, Euler buckling, beam or section"
      filtering={false}
      isShowingDetail
    >
      {directInput && (
        <List.Section title="Calculate typed values">
          <List.Item
            id="typed-input"
            title={sectionInput ? "Calculate section properties" : "Calculate beam"}
            subtitle="Use the values you typed"
            icon={Icon.Calculator}
            detail={
              <List.Item.Detail
                markdown={`**${sectionInput ? "Section properties" : "Beam calculation"}**\n\n${query}\n\n**Press Enter to calculate these values.** You can edit the input in the calculator.`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Calculate Typed Values"
                  onAction={() =>
                    sectionInput
                      ? openFormula("properties", query)
                      : push(<Analysis initialQuery={query} initialMaterial={material} initialSection={section} />)
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {[...new Set(rows.map((r) => r.group))].map((group) => (
        <List.Section key={group} title={group}>
          {rows
            .filter((r) => r.group === group)
            .map((r) => (
              <List.Item
                id={r.id}
                key={r.id}
                title={r.title}
                subtitle={r.subtitle}
                icon={Icon.Calculator}
                detail={<List.Item.Detail markdown={r.detail} />}
                actions={
                  <ActionPanel>
                    <Action title={"Open " + r.title} onAction={r.open} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
      <List.EmptyView
        title="Find a calculator"
        description="Try stress, Euler, buckling, section modulus, beam or library."
      />
    </List>
  );
}
