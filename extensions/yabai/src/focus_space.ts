import { LaunchProps, showHUD } from "@raycast/api";
import { execYabaiCommand } from './utils';

export default async function main(args: LaunchProps) {
    console.log(args.arguments.spaceIndex);
    const spaceIndex = parseInt(args.arguments.spaceIndex, 10);
    if (isNaN(spaceIndex)) {
        showHUD(`Invalid space index: ${args.arguments.spaceIndex}`);
        return;
    }

    try {
        await execYabaiCommand(`-m space --focus ${spaceIndex}`);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("already focused space")) {
                return;
            }
            console.error("Error executing yabai commands", error);
            await showHUD(`Error: ${error.message}`);
            return;
        }
        await showHUD(`Error: ${error}`);
    }
}
