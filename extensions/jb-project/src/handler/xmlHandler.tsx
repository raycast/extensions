import {Project} from "../interfaces";
import fs from "fs";
import {isNotEmpty} from "./readTxt";
import {XMLParser} from "fast-xml-parser";
import {homedir} from "os";
import lastDirName from "./filename";
import {randomId} from "@raycast/api";

export default function parsingProductConfig(configFile: string) {
    let projs: Project[] = [];
    const data = fs.readFileSync(configFile, 'utf8');
    if (isNotEmpty(data)) {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "kpx_",
            removeNSPrefix: true
        };
        const parser = new XMLParser(options);
        const output = parser.parse(data);
        const projectItems = output.application.component.option;
        // Clion config is different
        let isSingleProject = false;
        let singleProjectItem;
        if (projectItems.length == 2) {
            for (let i = 0; i < projectItems.length; i++) {
                if (projectItems[i].kpx_name == "additionalInfo") {
                    const map = projectItems[i].map
                    if (map.entry.constructor !== Array) {
                        isSingleProject = true;
                        singleProjectItem = map.entry
                    }
                }
            }
        }
        if (!(projectItems instanceof Array) || isSingleProject) {
            const map = projectItems.map;
            let entry = map.entry;
            if (isSingleProject) {
                entry = singleProjectItem
            }

            if (!(entry instanceof Array)) {
                let path = entry.kpx_key;
                const value = entry.value;
                const kpx_projectWorkspaceId = value.RecentProjectMetaInfo.kpx_projectWorkspaceId;
                const kpx_frameTitle = value.RecentProjectMetaInfo.kpx_frameTitle as string;
                const kpx_opened = value.RecentProjectMetaInfo.kpx_opened;
                const option = value.RecentProjectMetaInfo.option;
                let projectOpenTimestamp = 0;
                for (const optionsKey in option) {
                    const opValue = option[optionsKey];

                    if (opValue.kpx_name === 'projectOpenTimestamp') {
                        projectOpenTimestamp = opValue.kpx_value
                    }
                }
                let displayName = "";
                if (isNotEmpty(kpx_frameTitle)) {
                    displayName = kpx_frameTitle.split("–")[0].trim()
                    displayName = displayName.split(" ")[0].trim()
                }
                path = path.replace("$USER_HOME$", homedir());

                const proj = {
                    id: kpx_projectWorkspaceId,
                    path: path,
                    name: isNotEmpty(displayName) ? displayName : lastDirName(path),
                    timestamp: projectOpenTimestamp,
                    opened: kpx_opened
                };

                projs.push(proj);
            } else {
                entry.map(valueElement => {
                    const value = valueElement.value;
                    const kpx_projectWorkspaceId = value.RecentProjectMetaInfo.kpx_projectWorkspaceId;
                    const kpx_opened = value.RecentProjectMetaInfo.kpx_opened;
                    const kpx_frameTitle = value.RecentProjectMetaInfo.kpx_frameTitle as string;
                    const option = value.RecentProjectMetaInfo.option;
                    let projectOpenTimestamp = 0;
                    let path = valueElement.kpx_key;
                    for (const optionsKey in option) {
                        const opValue = option[optionsKey];

                        if (opValue.kpx_name === 'projectOpenTimestamp') {
                            projectOpenTimestamp = opValue.kpx_value
                        }
                    }
                    let displayName = "";
                    if (isNotEmpty(kpx_frameTitle)) {
                        displayName = kpx_frameTitle.split("–")[0].trim()
                        displayName = displayName.split(" ")[0].trim()
                    }
                    path = path.replace("$USER_HOME$", homedir());

                    const proj = {
                        id: kpx_projectWorkspaceId,
                        path: path,
                        name: isNotEmpty(displayName) ? displayName : lastDirName(path),
                        timestamp: projectOpenTimestamp,
                        opened: kpx_opened
                    };

                    projs.push(proj);
                })
            }
        } else {
            for (const projectItemsKey in projectItems) {
                const projectItem = projectItems[projectItemsKey];
                const map = projectItem.map;
                for (const projectsKey in map) {
                    const keys = map[projectsKey]
                    for (const key in keys) {
                        const title = keys[key].value.RecentProjectMetaInfo.kpx_frameTitle as string;
                        const kpx_opened = keys[key].value.RecentProjectMetaInfo.kpx_opened;

                        const option = keys[key].value.RecentProjectMetaInfo.option;
                        let projectOpenTimestamp = 0;
                        for (const optionsKey in option) {
                            const opValue = option[optionsKey];
                            if (opValue.kpx_name === 'projectOpenTimestamp') {
                                projectOpenTimestamp = opValue.kpx_value
                            }
                        }
                        let displayName = "";
                        if (isNotEmpty(title)) {
                            displayName = title.split("–")[0].trim()
                            displayName = displayName.split(" ")[0].trim()
                        }
                        let path = keys[key].kpx_key;
                        path = path.replace("$USER_HOME$", homedir());
                        const proj = {
                            id: randomId(),
                            path: path,
                            name: isNotEmpty(displayName) ? displayName : lastDirName(path),
                            timestamp: projectOpenTimestamp,
                            opened: kpx_opened
                        }

                        projs.push(proj)
                    }
                }
            }
        }

    }

    projs = projs.sort((item1, item2) => {
        return item2.timestamp - item1.timestamp;
    });
    // check name is exist
    projs.map((proj, index) => {
        const name = proj.name;
        for (let i = 0; i < projs.length; i++) {
            if (projs[i].name === name && i !== index) {
                proj.duplication = true;
            }
        }
    })
    return projs;
}

