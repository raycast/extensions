#!/usr/bin/env node

// A wrapper script that calls qutebrowser with specific arguments
// Usage: node wrap-command.js ":session-save test-name"

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execPromise = util.promisify(exec);
const qutebrowserPath = "/opt/homebrew/bin/qutebrowser";
const logFile = path.join(os.homedir(), 'Desktop', 'wrapper-test.log');

// Ensure we have a command
if (process.argv.length < 3) {
  console.error('Usage: node wrap-command.js ":session-save test-name"');
  process.exit(1);
}

const command = process.argv[2];
fs.appendFileSync(logFile, `[${new Date().toISOString()}] Running command: ${command}\n`);

// Execute in four different ways and log results
async function run() {
  console.log(`Running command: ${command}`);
  console.log(`Results will be logged to: ${logFile}`);
  
  try {
    // Method 1: With quotes
    fs.appendFileSync(logFile, `\n--- Method 1: With quotes ---\n`);
    fs.appendFileSync(logFile, `Command: "${qutebrowserPath}" "${command}"\n`);
    try {
      const result = await execPromise(`"${qutebrowserPath}" "${command}"`);
      fs.appendFileSync(logFile, `Success!\n`);
      if (result.stdout) fs.appendFileSync(logFile, `stdout: ${result.stdout}\n`);
      if (result.stderr) fs.appendFileSync(logFile, `stderr: ${result.stderr}\n`);
    } catch (error) {
      fs.appendFileSync(logFile, `Error: ${error.message}\n`);
      if (error.stdout) fs.appendFileSync(logFile, `stdout: ${error.stdout}\n`);
      if (error.stderr) fs.appendFileSync(logFile, `stderr: ${error.stderr}\n`);
    }
    
    // Method 2: Without quotes
    fs.appendFileSync(logFile, `\n--- Method 2: Without quotes ---\n`);
    fs.appendFileSync(logFile, `Command: ${qutebrowserPath} ${command}\n`);
    try {
      const result = await execPromise(`${qutebrowserPath} ${command}`);
      fs.appendFileSync(logFile, `Success!\n`);
      if (result.stdout) fs.appendFileSync(logFile, `stdout: ${result.stdout}\n`);
      if (result.stderr) fs.appendFileSync(logFile, `stderr: ${result.stderr}\n`);
    } catch (error) {
      fs.appendFileSync(logFile, `Error: ${error.message}\n`);
      if (error.stdout) fs.appendFileSync(logFile, `stdout: ${error.stdout}\n`);
      if (error.stderr) fs.appendFileSync(logFile, `stderr: ${error.stderr}\n`);
    }
    
    console.log('Done! Check the log file for results.');
  } catch (error) {
    console.error('Unhandled error:', error);
    fs.appendFileSync(logFile, `Unhandled error: ${error.message}\n`);
  }
}

run();