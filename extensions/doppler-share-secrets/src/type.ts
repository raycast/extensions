export interface Body {
  url: string;
  authenticated_url: string;
  password: string;
  success: boolean;
}
export enum SecretVisibility {
  MASKED = "masked",
  UNMASKED = "unmasked",
  RESTRICTED = "restricted",
}
export interface DopplerSecret {
  raw: string;
  computed: string;
  note: string;
  rawVisibility: SecretVisibility;
  computedVisibility: SecretVisibility;
  rawValueType: {
    type_: string;
  };
  computedValueType: {
    type_: string;
  };
}
