import yaml from "js-yaml";

const jsonToYaml = (input: object) => {
  try {
    return yaml.dump(input);
  } catch (err) {
    return "Invalid JSON";
  }
};

export default jsonToYaml;
