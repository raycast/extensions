import { exec } from "child_process";
import os from "os"; // Import the 'os' module
import { promisify } from "util";

const execAsync = promisify(exec);

function yabaiPath(){
    return process.arch === "arm64" ? "/opt/homebrew/bin/yabai" : "/usr/local/bin/yabai";
}

export async function execYabaiCommand(flags: string, callback?: (error: Error | null, stdout: string, stderr: string) => void){
    // Get current user's username
    const username = os.userInfo().username;

    return await execAsync(`${yabaiPath()} ${flags}`, { env: { ...process.env, USER: username } });
}