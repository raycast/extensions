import { Clipboard, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import yamljs from "yamljs";

type CommandFormValues = {
  textarea: string;
  checkbox: boolean;
};

export const isValidYaml = async (yaml: string): Promise<boolean> => {
  if (yaml.length === 0) {
    await showToast(Toast.Style.Failure, "Empty Yaml");
    return false;
  }

  return true;
};

export const generateJsonFromYaml = async (yaml: string) => {
  try {
    return yamljs.parse(yaml);
  } catch (e) {
    await showToast(Toast.Style.Failure, "Invalid Yaml");
    return;
  }
};

export const copyToClipboard = async (values: CommandFormValues) => {
  const { textarea, checkbox } = values;

  if (!(await isValidYaml(textarea))) {
    return;
  }

  const jsonFromYaml = await generateJsonFromYaml(textarea);
  const jsonResult = checkbox ? JSON.stringify(jsonFromYaml) : JSON.stringify(jsonFromYaml, null, "\t");
  await Clipboard.copy(jsonResult);

  await showHUD("Copied to clipboard");
  await popToRoot();
};
