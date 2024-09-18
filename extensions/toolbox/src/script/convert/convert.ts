import { Script } from "../type";
import yaml from "js-yaml";
import JSON5 from "json5";

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

export const javaScriptToJson: Script = {
  info: {
    title: "JS Object to JSON",
    desc: "Convert JavaScript Object to JSON",
    type: ["form", "clipboard"],
    keywords: ["markup"],
    example: "{ name: 'John', age: 30, city: 'New York' }",
  },
  run(input) {
    try {
      return JSON.stringify(JSON5.parse(input), null, 2);
    } catch (error) {
      throw Error("Invalid JavaScript Object");
    }
  },
};

export const jsonToJavaScript: Script = {
  info: {
    title: "JSON to JS Object",
    desc: "Convert JSON to JavaScript Object",
    type: ["form", "clipboard"],
    keywords: ["markup"],
    example: '{"name": "John", "age": 30, "city": "New York"}',
  },
  run(input) {
    try {
      return JSON5.stringify(JSON.parse(input), null, 2);
    } catch (error) {
      throw Error("Invalid JSON");
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

export const HexToString: Script = {
  info: {
    title: "Hex to String",
    desc: "Convert Hex to UTF8 String",
    type: ["form", "clipboard"],
    keywords: ["markup"],
    example: "72617963617374",
  },
  run(input) {
    return Buffer.from(input, "hex").toString("utf8");
  },
};

export const StringToHex: Script = {
  info: {
    title: "String to Hex",
    desc: "Convert UTF8 String to Hex",
    type: ["form", "clipboard"],
    keywords: ["markup"],
    example: "raycast",
  },
  run(input) {
    return Buffer.from(input, "utf8").toString("hex");
  },
};
