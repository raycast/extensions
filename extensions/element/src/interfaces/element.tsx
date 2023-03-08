export interface Elements {
  elements: SingleElement[];
}

export interface SingleElement {
  name: string;
  appearance: null | string;
  atomic_mass: number;
  boil: number | null;
  category: string;
  density: number | null;
  discovered_by: null | string;
  melt: number | null;
  molar_heat: number | null;
  named_by: null | string;
  number: number;
  period: number;
  phase: string;
  source: string;
  spectral_img: null | string;
  summary: string;
  symbol: string;
  xpos: number;
  ypos: number;
  shells: number[];
  electron_configuration: string;
  electron_configuration_semantic: string;
  electron_affinity: number | null;
  electronegativity_pauling: number | null;
  ionization_energies: number[];
  "cpk-hex": null | string;
}
