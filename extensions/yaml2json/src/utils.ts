import {showToast, Toast} from "@raycast/api";
import yamljs from "yamljs";

export const isValidYaml = async (yaml: string): Promise<boolean> => {
    if (yaml.length === 0) {
        await showToast(Toast.Style.Failure, "Empty Yaml");
        return false;
    }

    return true;
}

export const generateJsonFromYaml = async (yaml: string) => {
    const temp = yaml.replace(/\n/g, "");
    try {
        return yamljs.parse(temp);
    } catch (e) {
        await showToast(Toast.Style.Failure, "Invalid Yaml");
        return;
    }
}
