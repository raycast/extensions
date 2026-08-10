import { stringify } from "@iarna/toml";

export const TransformJSONtoTOML = {
  from: "JSON",
  to: "TOML",
  transform: (value: string) => stringify(JSON.parse(value)),
};
