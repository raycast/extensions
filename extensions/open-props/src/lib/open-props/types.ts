export type SupportedVersion = "1";

export type CssVar = {
  name: string;
  value: string;
};

export type VersionConfig = {
  version: SupportedVersion;
  sections: {
    name: string;
    file: string;
    type?: "color";
  }[];
};

export type VarsSection = VersionConfig["sections"][number] & {
  vars: CssVar[];
};
