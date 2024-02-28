import { closeMainWindow, open, LaunchProps } from "@raycast/api";
import { checkDropshareInstallation, isDropshareInstalled } from "./utils/check";

namespace Dropshare {
    export type Upload = {
        file: string;
    }
}

export default async function Upload(props: LaunchProps<{ arguments: Dropshare.Upload }>) {
    const { file } = props.arguments;

    checkDropshareInstallation();

    if (await isDropshareInstalled() === true) {
        const url = "dropshare5:///action/upload?file=" + file;
        open(url);
        await closeMainWindow();
    }
}