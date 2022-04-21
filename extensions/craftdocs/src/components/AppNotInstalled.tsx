import {Detail, environment} from "@raycast/api";

export default function AppNotInstalled() {
    return <Detail markdown={appNotInstalledMarkdown} />
}

const appNotInstalledMarkdown = `Craft app is not installed.

![image](${environment.assetsPath}/command-icon.png)

You can read what this is at the [official website](https://www.craft.do/)!`