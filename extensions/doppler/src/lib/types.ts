export type SecretVisibility = "masked" | "unmasked" | "restricted";
export type DopplerSecret = {
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
};
