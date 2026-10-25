import { Form } from "@raycast/api";
import { Formula, FormulaValues } from "../core/formulas";
import { engineeringFields, engineeringKeys } from "../core/engineering-input";
import { inputUnit, displayInput } from "../core/formula-input";
import { isSteel, isTimber, torqueCases, ltbCases, materialStrength } from "../core/stability-torsion";
import { Material } from "../core/types";
export function EngineeringFields({
  formula: f,
  values: v,
  material: m,
}: {
  formula: Formula;
  values: FormulaValues;
  material: Material;
}) {
  const keys = engineeringKeys(f.id).filter(
    (k) =>
      !(["fy", "alphaY", "alphaZ", "alphaLT"].includes(k) && !isSteel(m)) &&
      !(["fc", "fm", "E05", "G05", "betaC"].includes(k) && !isTimber(m)),
  );
  if (!keys.length) return null;
  const p = materialStrength(m, v);
  const hints: Record<string, number | undefined> = {
    E05: p.E05,
    G05: p.G05,
    fc: p.fc,
    fm: p.fm,
    fy: p.fy ?? p.nominalFy,
    alphaY: 0.34,
    alphaZ: 0.34,
    alphaLT: 0.34,
    betaC: /glulam|lvl/i.test(m.family) ? 0.1 : 0.2,
    Ky: v.K,
    Kz: v.K,
    kLT: 1,
    kw: 1,
  };
  return (
    <>
      <Form.Separator />
      <Form.Description
        title={f.id === "euler" ? "Buckling FYI" : "Calculation options"}
        text="Optional overrides. Blank inherits CSV data or the clearly shown method default. Factors are educational results; no resistance or utilization check. Steel fy requires product/thickness confirmation."
      />
      {f.id === "torsion-warping" && (
        <Form.Dropdown id="torqueCase" title="Torsion restraints" defaultValue={String(v.torqueCase ?? 0)}>
          {torqueCases.map((t, i) => (
            <Form.Dropdown.Item key={i} value={String(i)} title={t} />
          ))}
        </Form.Dropdown>
      )}
      {f.id === "ltb" && (
        <Form.Dropdown id="ltbCase" title="LTB load and support case" defaultValue={String(v.ltbCase ?? 0)}>
          {ltbCases.map((t, i) => (
            <Form.Dropdown.Item key={i} value={String(i)} title={t} />
          ))}
        </Form.Dropdown>
      )}
      {f.id === "ltb" && isSteel(m) && (
        <Form.Dropdown id="modulusBasis" title="EC3 reference modulus" defaultValue={String(v.modulusBasis ?? 0)}>
          {[
            "Elastic Wel,y — Class 3 reference",
            "Plastic Wpl,y — Classes 1–2 reference",
            "Effective Weff,y — supplied Class 4 property",
          ].map((t, i) => (
            <Form.Dropdown.Item key={i} value={String(i)} title={t} />
          ))}
        </Form.Dropdown>
      )}
      {f.id === "euler" && isSteel(m) && (
        <Form.Dropdown id="areaBasis" title="EC3 reference area" defaultValue={String(v.areaBasis ?? 0)}>
          <Form.Dropdown.Item value="0" title="Gross A — Classes 1–3 reference" />
          <Form.Dropdown.Item value="1" title="Effective Aeff — supplied Class 4 property" />
        </Form.Dropdown>
      )}
      {keys.map((k) => (
        <Form.TextField
          key={k}
          id={k}
          title={`${engineeringFields[k]?.title || "Optional member length"} (${inputUnit(f, k)})`}
          defaultValue={(v as any)[k] === undefined ? "" : String(displayInput(f, k, (v as any)[k]))}
          placeholder={hints[k] === undefined ? "Automatic / from section CSV" : String(hints[k])}
          info={
            k === "fy"
              ? "Confirm fy for the actual steel product and thickness. The grade-name value is a suggestion only."
              : "Blank uses CSV/default. Named input also works in the search bar; e.g. alphaY=0.34 or Iw=1.275e10mm6."
          }
        />
      ))}
    </>
  );
}
export function readEngineeringOptions(
  f: Formula,
  form: Record<string, string>,
  scalar: (key: string, text: string) => number,
): Partial<FormulaValues> {
  const out: Partial<FormulaValues> = {};
  for (const k of engineeringKeys(f.id)) if (form[k]?.trim()) (out as any)[k] = scalar(k, form[k]);
  for (const k of ["torqueCase", "ltbCase", "modulusBasis", "areaBasis"])
    if (form[k] !== undefined) (out as any)[k] = Number(form[k]);
  return out;
}
