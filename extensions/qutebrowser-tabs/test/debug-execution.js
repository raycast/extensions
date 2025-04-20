// Debug script to test different ways of executing qutebrowser commands
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const command = process.argv[2] || ':session-save';
const qutebrowserPath = '/opt/homebrew/bin/qutebrowser';

console.log(`Testing execution of qutebrowser command: ${command}`);

// Method 1: Basic exec (like our extension currently uses)
async function method1() {
  try {
    console.log("\nMethod 1: Basic exec");
    console.log(`Executing: "${qutebrowserPath}" "${command}"`);
    const result = await execPromise(`"${qutebrowserPath}" "${command}"`);
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Method 2: Using shell syntax
async function method2() {
  try {
    console.log("\nMethod 2: Shell syntax");
    console.log(`Executing: ${qutebrowserPath} ${command}`);
    const result = await execPromise(`${qutebrowserPath} ${command}`);
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Method 3: Using child_process.spawn
async function method3() {
  console.log("\nMethod 3: Using spawn");
  
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    console.log(`Spawning: ${qutebrowserPath} with args [${command}]`);
    
    const child = spawn(qutebrowserPath, [command], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      console.error("Spawn error:", error.message);
      resolve();
    });
    
    child.on('close', (code) => {
      console.log(`Child process exited with code ${code}`);
      resolve();
    });
  });
}

// Method 4: Alternate quoting
async function method4() {
  try {
    console.log("\nMethod 4: Alternate quoting");
    console.log(`Executing: "${qutebrowserPath}" ${command}`);
    const result = await execPromise(`"${qutebrowserPath}" ${command}`);
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Method 5: Using execFile
async function method5() {
  console.log("\nMethod 5: Using execFile");
  
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    console.log(`ExecFile: ${qutebrowserPath} with args [${command}]`);
    
    execFile(qutebrowserPath, [command], (error, stdout, stderr) => {
      if (error) {
        console.error("ExecFile error:", error.message);
      }
      if (stdout) console.log("stdout:", stdout);
      if (stderr) console.log("stderr:", stderr);
      resolve();
    });
  });
}

// Method 6: Direct shell command as would type in terminal
async function method6() {
  try {
    console.log("\nMethod 6: Terminal-like execution");
    const cmdLine = `qutebrowser ${command}`;
    console.log(`Executing: ${cmdLine}`);
    const result = await execPromise(cmdLine);
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run all methods
async function runAll() {
  process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;
  console.log("PATH:", process.env.PATH);
  
  await method1();
  await method2();
  await method3();
  await method4();
  await method5();
  await method6();
  
  console.log("\nAll tests completed");
}

runAll();