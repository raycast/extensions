// Minimal script to try to reproduce qutebrowser crash
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const os = require('os');

// Path to common files
const qutebrowserPath = '/opt/homebrew/bin/qutebrowser';
const sessionDir = `${os.homedir()}/Library/Application Support/qutebrowser/sessions`;
const logFile = `${os.tmpdir()}/qutebrowser-crash-test.log`;

fs.writeFileSync(logFile, `Test started at ${new Date().toISOString()}\n`);

// Function to wait for a specified time
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to append to log
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
  console.log(message);
}

// Test different combinations
async function runTest(index, command, options = {}) {
  log(`\n===== TEST ${index}: ${command} =====`);

  // First, make sure we can read the session file before the command
  try {
    const beforeStats = fs.statSync(`${sessionDir}/_autosave.yml`);
    log(`Session file exists before the command (${beforeStats.size} bytes)`);
  } catch (error) {
    log(`Error checking session file before command: ${error.message}`);
  }

  // Execute the command
  try {
    log(`Executing: ${command}`);
    const startTime = Date.now();
    
    // Execute with a timeout to catch hangs
    const result = await Promise.race([
      execPromise(command, options),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Command timed out')), 10000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    log(`Command completed in ${duration}ms`);
    log(`stdout: ${result.stdout.trim() || '(empty)'}`);
    log(`stderr: ${result.stderr.trim() || '(empty)'}`);
    
    // Wait a bit for any background operations to complete
    await sleep(500);
    
    // Check if session file was updated
    try {
      const afterStats = fs.statSync(`${sessionDir}/_autosave.yml`);
      log(`Session file exists after the command (${afterStats.size} bytes)`);
    } catch (error) {
      log(`Error checking session file after command: ${error.message}`);
    }
    
    log(`Test ${index} PASSED`);
    return true;
  } catch (error) {
    log(`Test ${index} FAILED: ${error.message}`);
    if (error.stdout) log(`stdout: ${error.stdout.trim()}`);
    if (error.stderr) log(`stderr: ${error.stderr.trim()}`);
    return false;
  }
}

// Main test function
async function main() {
  log(`Starting tests, log file: ${logFile}`);
  
  try {
    // Test 1: Basic command (what we were using)
    await runTest(1, `"${qutebrowserPath}" ":session-save"`);
    
    // Test 2: Without quotes
    await runTest(2, `${qutebrowserPath} :session-save`);
    
    // Test 3: With custom session name
    await runTest(3, `${qutebrowserPath} ":session-save raycast_temp"`);
    
    // Test 4: With environment variables that might be different in Raycast
    await runTest(4, `${qutebrowserPath} ":session-save"`, {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1", // Simulate Raycast environment
        ORIGINAL_XDG_CURRENT_DESKTOP: "undefined"
      }
    });
    
    // Test 5: With different working directory
    await runTest(5, `${qutebrowserPath} ":session-save"`, {
      cwd: os.tmpdir()
    });
    
    // Test 6: With environment similar to Raycast
    await runTest(6, `${qutebrowserPath} ":session-save"`, {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        ORIGINAL_XDG_CURRENT_DESKTOP: "undefined",
        RAYCAST: "1",
        RAYCAST_EXTENSION: "true"
      },
      cwd: os.tmpdir()
    });

    log("All tests completed");
  } catch (error) {
    log(`ERROR: ${error.message}`);
  }
  
  log(`Check ${logFile} for full test results`);
  console.log(`\nFull log saved to: ${logFile}`);
}

main();
