import { Section } from "./types";
import { numberField } from "./csv";
import { energyShearArea } from "./deformation";
import { shearProfile } from "./stresses";
export const propertyGroups = ["General", "Bending", "Shear", "Torsion", "Warping", "Stability"] as const;
export type PropertyGroup = (typeof propertyGroups)[number];
export interface PropertyInfo {
  key: string;
  symbol: string;
  name: string;
  aliases: string;
  unit: string;
  group: PropertyGroup;
  meaning: string;
  use: string;
  tex: string;
  code?: string;
  codeTex?: string;
  source?: string;
}
const ec3 = "https://steelconstruction.info/topics/design/member-design";
const info = (
  key: string,
  symbol: string,
  name: string,
  aliases: string,
  unit: string,
  group: PropertyGroup,
  meaning: string,
  use: string,
  tex: string,
  code?: string,
  codeTex?: string,
): PropertyInfo => ({
  key,
  symbol,
  name,
  aliases,
  unit,
  group,
  meaning,
  use,
  tex,
  code,
  codeTex,
  source: code ? ec3 : undefined,
});
export const propertyInfo: PropertyInfo[] = [
  info(
    "A",
    "A",
    "Gross cross-sectional area",
    "Ag",
    "mm²",
    "General",
    "Total solid material area before deductions for holes or notches.",
    "Use for average axial stress, mass and axial stiffness EA/L. The 2D beam engine uses gross area.",
    String.raw`A=\int_A dA,\quad \sigma_N=\frac{N}{A},\quad k_N=\frac{EA}{L}`,
    "EC3 2005, 6.2.4: gross yielding in compression for Classes 1–3; member buckling remains a separate check.",
    String.raw`N_{pl,Rd}=\frac{Af_y}{\gamma_{M0}}`,
  ),
  info(
    "Iy",
    "Iy",
    "Second moment of area about y",
    "Iyy",
    "mm⁴",
    "Bending",
    "Distribution of material relative to the centroidal y-axis. Distances in the integral are measured along z.",
    "Use EIy for bending stiffness, elastic deflection and flexural buckling about y. Increasing depth strongly increases this property.",
    String.raw`I_y=\int_A z^2dA,\quad \delta_{max}=\frac{5qL^4}{384EI_y}`,
  ),
  info(
    "Iz",
    "Iz",
    "Second moment of area about z",
    "Izz",
    "mm⁴",
    "Bending",
    "Distribution of material relative to the centroidal z-axis, using squared y distances.",
    "Use EIz for bending and buckling about z. A tall narrow rectangle is usually much less stiff about z than y.",
    String.raw`I_z=\int_A y^2dA,\quad N_{cr,z}=\frac{\pi^2EI_z}{L_{cr,z}^2}`,
  ),
  info(
    "Wy",
    "Wel,y",
    "Elastic section modulus about y",
    "Wy; Ze,y; Sy in some catalogues",
    "mm³",
    "Bending",
    "Iy divided by the largest distance from the centroid to the outer fibre in z. This value describes the more highly stressed extreme fibre.",
    "Use M/W for uncoupled uniaxial elastic bending. For asymmetric sections use the full inertia tensor. Timber bending uses elastic rather than plastic section modulus.",
    String.raw`W_{el,y}=\frac{I_y}{z_{max}},\quad |\sigma_m|=\frac{|M_y|}{W_{el,y}}`,
    "EC3 2005, 6.2.5: Class 3 elastic bending; combined actions and stability are separate.",
    String.raw`M_{el,Rd}=\frac{W_{el,y}f_y}{\gamma_{M0}}`,
  ),
  info(
    "Wz",
    "Wel,z",
    "Elastic section modulus about z",
    "Wz; Ze,z; Sz in some catalogues",
    "mm³",
    "Bending",
    "Iz divided by the largest outer-fibre distance in y.",
    "Use for elastic bending about z, with matching Mz and Iz. The displayed value uses the more distant fibre.",
    String.raw`W_{el,z}=\frac{I_z}{y_{max}},\quad |\sigma_m|=\frac{|M_z|}{W_{el,z}}`,
  ),
  info(
    "ry",
    "iy",
    "Radius of gyration about y",
    "ry",
    "mm",
    "Stability",
    "Equivalent distance at which the area could be concentrated while preserving Iy.",
    "Use for geometric slenderness Lcr/iy. A larger radius reduces slenderness for a given effective length.",
    String.raw`i_y=\sqrt{\frac{I_y}{A}},\quad \lambda_y=\frac{L_{cr,y}}{i_y}`,
    "EC3 flexural buckling: relative slenderness for Classes 1–3 uses gross area; Class 4 uses the appropriate effective area.",
    String.raw`\bar\lambda_y=\sqrt{\frac{Af_y}{N_{cr,y}}},\quad \lambda_1=\pi\sqrt{\frac{E}{f_y}}`,
  ),
  info(
    "rz",
    "iz",
    "Radius of gyration about z",
    "rz",
    "mm",
    "Stability",
    "Radius obtained from Iz and gross area.",
    "Compare both axes using their own effective lengths. The smaller radius alone does not govern if restraint lengths differ.",
    String.raw`i_z=\sqrt{\frac{I_z}{A}},\quad \lambda_z=\frac{L_{cr,z}}{i_z}`,
  ),
  info(
    "Anet",
    "Anet",
    "Net cross-sectional area",
    "A_net",
    "mm²",
    "General",
    "Gross area minus connection-specific holes, slots or notches at the critical section. Supplied data only; holes are not inferred from the outline.",
    "Use for net tension stress. Hole paths, stagger and material-specific connection rules must be considered before supplying this value.",
    String.raw`\sigma_{t,net}=\frac{N}{A_{net}}`,
    "EC3 2005, 6.2.3: ordinary net-section tension fracture, subject to connection rules. Timber tension uses the applicable net section and design tensile strength.",
    String.raw`N_{u,Rd}=\frac{0.9A_{net}f_u}{\gamma_{M2}}`,
  ),
  info(
    "Aeff",
    "Aeff",
    "Effective cross-sectional area",
    "A_eff",
    "mm²",
    "General",
    "Reduced area accounting for specified local plate-buckling effects. It depends on the stress state and effective-width calculation.",
    "Use supplied effective properties for Class 4 steel compression. This general calculator does not calculate effective widths or classify the section.",
    String.raw`\sigma_N=\frac{N}{A_{eff}}`,
    "EC3 2005, 6.2.4 and EN 1993-1-5: Class 4 compression, with applicable centroid shifts and interactions.",
    String.raw`N_{c,Rd}=\frac{A_{eff}f_y}{\gamma_{M0}}`,
  ),
  info(
    "Iyz",
    "Iyz",
    "Product moment of area",
    "Izy",
    "mm⁴",
    "Bending",
    "Signed product of y and z distances integrated over the area. It is zero when either centroidal axis is a symmetry axis.",
    "Use the complete tensor for coupled bending and principal axes. The alpha formula follows this app's positive Iyz integral convention.",
    String.raw`I_{yz}=\int_A yz\,dA,\quad \tan(2\alpha)=\frac{-2I_{yz}}{I_y-I_z}`,
  ),
  ...(["y", "z"] as const).map((axis) =>
    info(
      "Wpl" + axis,
      "Wpl," + axis,
      "Plastic section modulus about " + axis,
      "Zp," + axis,
      "mm³",
      "Bending",
      "Sum of absolute first moments about the plastic neutral axis, which divides a homogeneous section into equal areas.",
      "Used when the section can develop a fully plastic stress distribution. Do not use this value as elastic M/W or as a timber plastic resistance.",
      String.raw`W_{pl}=\int_A |r-r_{PNA}|\,dA`,
      "EC3 2005, 6.2.5: plastic bending for Classes 1–2, subject to shear, axial-force and stability requirements.",
      String.raw`M_{pl,Rd}=\frac{W_{pl}f_y}{\gamma_{M0}}`,
    ),
  ),
  ...(["y", "z"] as const).map((axis) =>
    info(
      "Weff" + axis,
      "Weff," + axis,
      "Effective section modulus about " + axis,
      "W_eff," + axis,
      "mm³",
      "Bending",
      "Elastic modulus of a supplied effective cross-section after local-buckling reductions.",
      "Use the effective section for the specified stress distribution; centroid shifts can introduce additional moments. No effective-width design is performed here.",
      String.raw`\sigma_m=\frac{M}{W_{eff}}`,
      "EC3 2005, 6.2.5 and EN 1993-1-5: Class 4 bending with applicable combined-action checks.",
      String.raw`M_{eff,Rd}=\frac{W_{eff}f_y}{\gamma_{M0}}`,
    ),
  ),
  ...(["y", "z"] as const).map((axis) =>
    info(
      "Q" + axis,
      "Q" + axis,
      "First moment of area at centroidal cut " + axis,
      "S" + axis + " (statical moment; catalogue-dependent)",
      "mm³",
      "Shear",
      "First moment of the material on one side of a specified cut, relative to its neutral axis. This displayed value is at the centroidal cut, not a section modulus.",
      "Use VQ/(It) at the same cut to find elastic shear stress or VQ/I for shear flow. Q changes with the position of the cut.",
      String.raw`Q=\int_{A^*}r\,dA,\quad \tau=\frac{VQ}{It}`,
      "For a homogeneous solid rectangle at the neutral axis, Q/(Ib)=3/(2A). Timber shear resistance also requires the applicable effective width and design strength.",
      String.raw`\tau_{max}=\frac{3|V|}{2A}`,
    ),
  ),
  ...(["y", "z"] as const).map((axis) =>
    info(
      "As" + axis,
      "As," + axis,
      "Energy shear area for force along " + axis,
      "A" + axis + " (app effective-area convention)",
      "mm²",
      "Shear",
      "Effective area that reproduces shear-strain energy in the Timoshenko beam model.",
      "Use GAs for shear stiffness. The calculated energy area is not automatically the Eurocode plastic shear area Av. For a solid rectangle As=5A/6.",
      String.raw`GA_s\,\gamma=V,\quad A_s=\frac{I^2}{\int Q^2/t\,dr}`,
    ),
  ),
  ...(["y", "z"] as const).map((axis) =>
    info(
      "Av" + axis,
      "Av," + axis,
      "Plastic design shear area along " + axis,
      "Av_" + axis + "; A_v_" + axis,
      "mm²",
      "Shear",
      "Code/product shear-resistance area supplied separately from the energy shear area.",
      "Use the direction of shear force, not the bending-axis name, when selecting this area. It is shown only when explicitly supplied.",
      String.raw`V_{pl,Rd}=\frac{A_vf_y}{\sqrt{3}\gamma_{M0}}`,
      "EC3 2005, 6.2.6, without torsion; check shear buckling and combined actions where required.",
    ),
  ),
  info(
    "J",
    "J",
    "Saint-Venant torsion constant",
    "It; I_T",
    "mm⁴",
    "Torsion",
    "Geometric constant relating Saint-Venant torsional moment to twist rate.",
    "Use GJ for free torsional stiffness. J is generally not Iy+Iz; equality holds for circular annular or solid sections. The present 2D engine does not solve torsion.",
    String.raw`T=GJ\,\frac{d\theta}{dx}`,
  ),
  info(
    "Ip",
    "Ip",
    "Polar second moment of area",
    "Ipolar; Ix (polar only)",
    "mm⁴",
    "Torsion",
    "Sum of the two centroidal planar second moments.",
    "Use as a geometric polar moment. Do not substitute it for J in noncircular torsion.",
    String.raw`I_p=I_y+I_z`,
  ),
  info(
    "Wt",
    "Wt",
    "Torsional section modulus",
    "W_t",
    "mm³",
    "Torsion",
    "Supplied torsional stress modulus for the adopted torsion convention.",
    "Use T/Wt only when it matches the product's torsional stress definition. Not inferred for general shapes.",
    String.raw`\tau_T=\frac{T}{W_t}`,
  ),
  info(
    "Iw",
    "Iw",
    "Warping constant",
    "Iω; Cw",
    "mm⁶",
    "Warping",
    "Sectorial warping property associated with nonuniform torsion and restrained warping.",
    "Use EIw for warping stiffness and in suitable lateral-torsional buckling expressions. The present 2D beam model does not calculate warping stress.",
    String.raw`B=-EI_\omega\,\theta''`,
    "Warping and lateral-torsional stability require restraint and load-position information; a value alone is not a resistance check.",
  ),
  info(
    "Ww",
    "Wω",
    "Warping section modulus",
    "Ww; W_omega",
    "mm⁴",
    "Warping",
    "Warping constant divided by the relevant extreme sectorial coordinate, according to the source convention.",
    "Used with a consistent bimoment convention to recover normal warping stress. Supplied data only.",
    String.raw`W_\omega=\frac{I_\omega}{|\omega|_{max}},\quad |\sigma_\omega|=\frac{|B|}{W_\omega}`,
  ),
  info(
    "Imajor",
    "Iu",
    "Major principal second moment",
    "Imajor",
    "mm⁴",
    "Stability",
    "Larger eigenvalue of the centroidal inertia tensor.",
    "Use for uncoupled principal-axis bending/buckling of asymmetric sections, with restraints expressed in that axis system.",
    String.raw`I_{u,v}=\frac{I_y+I_z}{2}\pm\sqrt{\left(\frac{I_y-I_z}{2}\right)^2+I_{yz}^2}`,
  ),
  info(
    "Iminor",
    "Iv",
    "Minor principal second moment",
    "Iminor",
    "mm⁴",
    "Stability",
    "Smaller eigenvalue of the centroidal inertia tensor.",
    "For equal effective lengths, the lower principal inertia gives the lower ideal Euler load.",
    String.raw`N_{cr,v}=\frac{\pi^2EI_v}{(KL)^2}`,
  ),
  info(
    "principalAngle",
    "α",
    "Principal-axis rotation",
    "alpha",
    "deg",
    "Stability",
    "Rotation from reference axes to the principal inertia system under this app's sign convention.",
    "Check the axis convention before using external catalogue angles. Principal axes are needed when Iyz is nonzero.",
    String.raw`\alpha=\frac12\operatorname{atan2}(-2I_{yz},I_y-I_z)`,
  ),
  ...(["b", "h", "d", "t", "tw", "tf"] as const).map((key) =>
    info(
      key,
      key,
      {
        b: "Width",
        h: "Height",
        d: "Diameter",
        t: "Wall thickness",
        tw: "Web thickness",
        tf: "Flange thickness",
      }[key],
      "",
      "mm",
      "General",
      "Nominal section dimension used by the geometric model.",
      "Use matching units and check the product drawing. Catalogue fillets and tapers can make tabulated properties differ from sharp-corner formulas.",
      String.raw`b,h,d,t\;[\mathrm{mm}]`,
    ),
  ),
  ...(["cy", "cz"] as const).map((key) =>
    info(
      key,
      key,
      "Centroid coordinate " + key.slice(1),
      key === "cy" ? "yc" : "zc",
      "mm",
      "General",
      "Area-weighted centroid coordinate measured from the section's lower/left geometry origin.",
      "Use to locate centroidal axes and extreme-fibre distances. This is not a shear-centre coordinate.",
      String.raw`\bar r=\frac{\int_A r\,dA}{A}`,
    ),
  ),
  info(
    "mass",
    "m",
    "Mass per unit length",
    "mass",
    "kg/m",
    "General",
    "Supplied product mass per metre.",
    "Multiply by gravity for self-weight per unit length. Material density and area provide another estimate if a product mass is unavailable.",
    String.raw`m=\rho A\,10^{-6}`,
  ),
];
export interface SectionProperty extends PropertyInfo {
  value: number;
  origin: string;
}
const rawAliases: Record<string, string[]> = {
  Anet: ["Anet", "A_net"],
  Aeff: ["Aeff", "A_eff"],
  Weffy: ["Weffy", "Weff_y", "W_eff_y"],
  Weffz: ["Weffz", "Weff_z", "W_eff_z"],
  Avy: ["Avy", "Av_y", "A_v_y"],
  Avz: ["Avz", "Av_z", "A_v_z"],
  Qy: ["Qy", "Q_y"],
  Qz: ["Qz", "Q_z"],
  Wt: ["Wt", "W_t"],
  Ww: ["Ww", "W_omega", "Womega"],
};
export const optionalSectionPropertyFields = [...new Set(Object.values(rawAliases).flat())];
export function sectionPropertyValues(s: Section): SectionProperty[] {
  const given = (key: string) => {
    for (const name of rawAliases[key] || [key]) {
      const value = numberField(s.raw, name);
      if (value !== null) return value;
    }
    return undefined;
  };
  const values: Record<string, number | undefined> = {
    A: s.A,
    Iy: s.Iy,
    Iz: s.Iz,
    Wy: s.Wy,
    Wz: s.Wz,
    ry: s.ry,
    rz: s.rz,
    Iyz: s.Iyz,
    J: s.J,
    Ip: s.Iy + s.Iz,
    Wply: s.Wply,
    Wplz: s.Wplz,
    Iw: s.Iw,
    b: s.b,
    h: s.h,
    d: s.d,
    t: s.t,
    tw: s.tw,
    tf: s.tf,
    cy: s.cy,
    cz: s.cz,
    mass: s.mass,
  };
  const origins: Record<string, string> = {};
  for (const key of Object.keys(rawAliases)) {
    values[key] = given(key);
    if (values[key] !== undefined) origins[key] = "CSV supplied; applicability follows its source";
  }
  const coupled = Math.abs(s.Iyz) > 1e-8 * Math.sqrt(s.Iy * s.Iz);
  if (coupled) {
    values.Imajor = s.Imajor;
    values.Iminor = s.Iminor;
    values.principalAngle = (s.principalAngle * 180) / Math.PI;
  }
  for (const axis of ["y", "z"] as const) {
    try {
      const area = energyShearArea(s, axis === "y" ? "z" : "y");
      values["As" + axis] = area.value;
      origins["As" + axis] = area.source + "; shear stiffness only";
    } catch {
      /* No valid energy area means no row. */
    }
  }
  // Q is exact for the idealized shape; do not attach it to catalogue fillets/overrides without source data.
  if (!["A", "Iy", "Iz", "Iyz", "cy", "cz"].some((key) => numberField(s.raw, key) !== null))
    for (const axis of ["y", "z"] as const) {
      if (values["Q" + axis] !== undefined) continue;
      const p = shearProfile(s, axis);
      values["Q" + axis] = p.points.find((v) => Math.abs(v.z - p.centroid) < 1e-9)?.Q;
      origins["Q" + axis] = "Calculated at centroidal cut on idealized geometry";
    }
  return propertyInfo.flatMap((p) => {
    const value = values[p.key];
    if (value === undefined || !Number.isFinite(value)) return [];
    if (["d"].includes(p.key) && !["circle", "chs"].includes(s.shape)) return [];
    if (["b", "h"].includes(p.key) && ["circle", "chs"].includes(s.shape)) return [];
    if (value <= 0 && !["Iyz", "cy", "cz", "principalAngle", "Iw"].includes(p.key)) return [];
    return [
      {
        ...p,
        value,
        origin:
          origins[p.key] ||
          (given(p.key) !== undefined ||
          (["Wply", "Wplz", "J", "Iw", "mass"].includes(p.key) && numberField(s.raw, p.key) !== null)
            ? "CSV catalogue/input"
            : "Calculated from section geometry/properties"),
      },
    ];
  });
}
