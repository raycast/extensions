"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateWithBiometric = authenticateWithBiometric;
exports.executeScriptWithAuth = executeScriptWithAuth;
exports.isBiometricAvailable = isBiometricAvailable;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function authenticateWithBiometric(options) {
    const { reason } = options;
    try {
        console.log("🔐 Requesting Touch ID/password authentication...");
        const appleScript = `do shell script "sudo -v" with prompt "${reason}" with administrator privileges`;
        await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
        console.log("✅ Authentication successful (Touch ID or password)");
        return {
            success: true,
            usedBiometric: true,
        };
    }
    catch (error) {
        console.error("Authentication error:", error);
        if (error.message?.includes("User canceled") ||
            error.message?.includes("-128") ||
            error.code === 128) {
            console.log("⚠️ Authentication canceled by user");
            return {
                success: false,
                usedBiometric: false,
                error: "Authentication was canceled by user",
            };
        }
        return {
            success: false,
            usedBiometric: false,
            error: error.message || "Authentication failed",
        };
    }
}
async function executeScriptWithAuth(scriptPath, reason) {
    try {
        console.log("🔐 Executing script with authentication...");
        const appleScript = `do shell script "${scriptPath}" with prompt "${reason}" with administrator privileges`;
        const { stdout } = await execAsync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
        console.log("✅ Script executed successfully");
        return {
            success: true,
            output: stdout,
        };
    }
    catch (error) {
        console.error("Error executing script:", error);
        if (error.message?.includes("User canceled") ||
            error.message?.includes("-128") ||
            error.code === 128) {
            return {
                success: false,
                error: "Authentication was canceled by user",
            };
        }
        return {
            success: false,
            error: error.message || "Script execution failed",
        };
    }
}
async function isBiometricAvailable() {
    try {
        const { stdout } = await execAsync("bioutil -r -s").catch(() => ({
            stdout: "",
        }));
        return stdout.trim().length > 0;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=biometricAuth.js.map