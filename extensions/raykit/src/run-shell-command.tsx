import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Diagnostic version - writes a file to prove the function is called
 */
export default function runShellCommand(command: string): Promise<string> {
  const timestamp = new Date().toISOString();
  const logPath = join(homedir(), "Desktop", "runShellCommand_diagnostic.txt");
  
  try {
    // Write diagnostic info to a file
    const diagnosticInfo = `Function called at: ${timestamp}\nCommand received: ${command}\n`;
    writeFileSync(logPath, diagnosticInfo);
    
    return Promise.resolve(`Diagnostic file written to Desktop at ${timestamp}`);
  } catch (error: any) {
    return Promise.resolve(`Failed to write diagnostic: ${error.message}`);
  }
}
