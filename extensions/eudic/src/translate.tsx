import { closeMainWindow, LaunchProps } from "@raycast/api";
import { runAppleScript } from "run-applescript";

interface EudicArguments {
    words: string;
}

export default async function Command(props: LaunchProps<{ arguments: EudicArguments }>) {
    const { words } = props.arguments;
    await closeMainWindow();
    await runAppleScript(`
        do shell script "open -b com.eusoft.eudic"
        do shell script "open -b com.eusoft.eudic"

        tell application id "com.eusoft.eudic"
            activate
            show dic with word "${words}"
        end tell`
    );
}

