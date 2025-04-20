// Environment test script
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');
const fs = require('fs');

// Log environment information
console.log("Current environment:");
console.log("Node version:", process.version);
console.log("Platform:", process.platform);
console.log("User env:", process.env.USER);
console.log("Home:", process.env.HOME);
console.log("PATH:", process.env.PATH);
console.log("PWD:", process.env.PWD);

// Log the current user
async function runCommand(cmd) {
  try {
    const result = await execPromise(cmd);
    return result.stdout.trim();
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

async function main() {
  // Log whoami
  const whoami = await runCommand('whoami');
  console.log("whoami:", whoami);
  
  // Log groups
  const groups = await runCommand('groups');
  console.log("groups:", groups);
  
  // Log qutebrowser version
  const qutebrowserVersion = await runCommand('/opt/homebrew/bin/qutebrowser --version');
  console.log("\nQutebrowser version info:");
  console.log(qutebrowserVersion);
  
  // Check for qutebrowser process
  const qutebrowserProcess = await runCommand('ps aux | grep -v grep | grep qutebrowser');
  console.log("\nQutebrowser process:");
  console.log(qutebrowserProcess);
  
  // Check permissions on session directory
  const homedir = os.homedir();
  const sessionDir = `${homedir}/Library/Application Support/qutebrowser/sessions`;
  
  console.log("\nSession directory permissions:");
  try {
    const stats = fs.statSync(sessionDir);
    console.log(`Directory exists: ${sessionDir}`);
    console.log(`Mode: ${stats.mode.toString(8)}`);
    console.log(`Owner UID: ${stats.uid}`);
    console.log(`Group GID: ${stats.gid}`);
    
    // List session files
    const files = fs.readdirSync(sessionDir);
    console.log("\nSession files:");
    for (const file of files) {
      const filePath = `${sessionDir}/${file}`;
      const fileStats = fs.statSync(filePath);
      console.log(`- ${file} (${fileStats.size} bytes, mode: ${fileStats.mode.toString(8)})`);
    }
  } catch (error) {
    console.error(`Error checking session directory: ${error.message}`);
  }
}

main();