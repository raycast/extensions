import { Script } from "../type";
import yaml from "js-yaml";

export const yamlToJson: Script = {
  info: {
    title: "YAML to JSON",
    desc: "Convert YAML to JSON",
    type: ["form", "clipboard"],
    keywords: ["markup"],
    example: "photos: \n" + "  total: 10000 \n" + "  total_pages: 910",
  },
  run(input) {
    try {
      return JSON.stringify(yaml.load(input), null, 2);
    } catch (error) {
      throw Error("Invalid YAML");
    }
  },
};

export const JsonToYaml: Script = {
  info: {
    title: "JSON to YAML",
    desc: "Convert JSON to YAML",
    type: ["form", "clipboard"],
    keywords: ["markup"],
    example: '{"photos": {"total": 10000,"total_pages": 910}}',
  },
  run(input) {
    try {
      return yaml.dump(JSON.parse(input));
    } catch (error) {
      throw Error("Invalid JSON");
    }
  },
};
