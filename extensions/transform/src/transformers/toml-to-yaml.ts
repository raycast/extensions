import { parse } from "@iarna/toml";
import { JSONtoYAML } from "@ultirequiem/y2j";

export const TransformTOMLtoYAML = {
  from: "TOML",
  to: "YAML",
  transform: (value: string) => JSONtoYAML(JSON.stringify(parse(value))),
};
