import { closeMainWindow, open, LaunchProps } from "@raycast/api";

namespace Dropshare {
    export type Upload = {
        file: string;
    }
}

export default async function Upload(props: LaunchProps<{ arguments: Dropshare.Upload }>) {
    const { file } = props.arguments;
    console.log(`file: ${file}`);

    const url = "dropshare5:///action/upload?file=" + file;
    open(url);
    await closeMainWindow();
}