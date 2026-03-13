import { parse } from "@iarna/toml";

export const TransformTOMLtoJSON = {
  from: "TOML",
  to: "JSON",
  transform: (value: string) => JSON.stringify(parse(value)),
};
