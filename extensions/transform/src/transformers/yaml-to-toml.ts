import { YAMLtoJSON } from "@ultirequiem/y2j";
import { stringify } from "@iarna/toml";

export const TransformYAMLtoTOML = {
  from: "YAML",
  to: "TOML",
  transform: (value: string) => stringify(JSON.parse(YAMLtoJSON(value))),
};
