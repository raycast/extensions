import {preferences} from "./preferences";
import {Clipboard, environment} from "@raycast/api";
import fs from "fs";
import YAML from "yaml";

export interface Cmd {
    cmd: string;
    remark: string;
}

export interface Key {
    key: string;
    remark: string;
    tags?: string;
    values: Cmd[];
}

export function getCustomConfigPath(): string {
    let customPath = preferences.customYamlPath;

    // use default
    if (customPath === './default-config.yaml') {
        customPath = `${environment.assetsPath}/default-config.yaml`;
    }
    return customPath;
}

/**
 * get file config
 * sync
 */
export function getFileConfig(): Key[] {
    let customPath = getCustomConfigPath();

    // read file to yaml
    const file = fs.readFileSync(customPath, 'utf8')
    return YAML.parse(file) as Key[];
}

/**
 * search level 1 key
 */
export async function searchLevel_1(config: Key[], searchKey: string): Promise<Key[]> {
    return config
        .filter(x => {
            return searchKey == '' || x.key.includes(searchKey) || x.tags?.includes(searchKey);
        }).slice(0, 9);
}

/**
 * search level 2 key
 */
export async function searchLevel_2(config: Key[], searchKey: string, searchCmd: string) {
    let find = config.find(x => x.key === searchKey);
    if (!find) {
        return Promise.any([]);
    }

    const clipText = await Clipboard.readText();

    return find.values
        .filter((x: any) => {
            return searchCmd === '' || x.cmd.includes(searchCmd) || x.remark?.includes(x);
        })
        .map((x: any) => {
            // clip replace
            if (clipText) {
                x.cmd = x.cmd?.replace(`{clip_0}`, clipText);
            }
            return x;
        })
        .slice(0, 9);
}
