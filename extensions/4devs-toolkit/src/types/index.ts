export interface GeneratorFormValues {
  quantity: string;
  masked: boolean;
}

export interface CPFFormValues extends GeneratorFormValues {
  state: string;
}

export interface CNPJFormValues extends GeneratorFormValues {}

export interface CNHFormValues extends GeneratorFormValues {}

export interface CertidaoFormValues extends GeneratorFormValues {
  type: string;
}

export interface CardFormValues extends GeneratorFormValues {
  brand: string;
  includeExpiry: boolean;
  includeCVV: boolean;
}

export interface PreferencesType {
  defaultMask: boolean;
  defaultQuantity: string;
  primaryAction: "copy" | "paste";
  enableHistory: boolean;
  exportFormat: "json" | "csv" | "text";
}
