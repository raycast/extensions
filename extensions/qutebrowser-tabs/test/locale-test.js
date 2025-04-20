// Test if locale settings affect qutebrowser command execution
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');

const logFile = '/Users/alonhearter/Desktop/qutebrowser-locale-test.log';
fs.writeFileSync(logFile, `Test started at ${new Date().toISOString()}\n\n`);

function log(message) {
  fs.appendFileSync(logFile, `${message}\n`);
  console.log(message);
}

async function testWithEnv(name, env) {
  log(`\n=== Test: ${name} ===`);
  log(`Environment:`);
  Object.keys(env).forEach(key => {
    log(`  ${key}=${env[key]}`);
  });
  
  try {
    // Execute command with specific environment
    log(`Executing: /opt/homebrew/bin/qutebrowser :session-save locale-${name}`);
    const result = await execPromise(
      `/opt/homebrew/bin/qutebrowser :session-save locale-${name}`, 
      { env }
    );
    
    log(`Success!`);
    if (result.stdout) log(`stdout: ${result.stdout}`);
    if (result.stderr) log(`stderr: ${result.stderr}`);
    return true;
  } catch (error) {
    log(`Error: ${error.message}`);
    if (error.stdout) log(`stdout: ${error.stdout}`);
    if (error.stderr) log(`stderr: ${error.stderr}`);
    return false;
  }
}

async function main() {
  // Record the normal environment first
  log('Current environment:');
  log(`PATH: ${process.env.PATH}`);
  log(`LANG: ${process.env.LANG}`);
  log(`LC_ALL: ${process.env.LC_ALL}`);
  log(`LC_CTYPE: ${process.env.LC_CTYPE}`);
  
  // Test with normal environment
  await testWithEnv('normal', process.env);
  
  // Test with minimal environment (like Raycast)
  const minimalEnv = {
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR || '/tmp',
    __CF_USER_TEXT_ENCODING: process.env.__CF_USER_TEXT_ENCODING,
  };
  await testWithEnv('minimal', minimalEnv);
  
  // Test with C locale (ASCII encoding)
  const cLocaleEnv = {
    ...process.env,
    LC_ALL: 'C',
    LANG: 'C',
  };
  await testWithEnv('c-locale', cLocaleEnv);
  
  // Test with minimal environment + C locale (closest to Raycast)
  const minimalCLocaleEnv = {
    ...minimalEnv,
    LC_ALL: 'C',
  };
  await testWithEnv('minimal-c-locale', minimalCLocaleEnv);
  
  // Test with UTF-8 forced even with minimal env
  const utf8Env = {
    ...minimalEnv,
    LC_ALL: 'en_US.UTF-8',
  };
  await testWithEnv('utf8', utf8Env);

  log(`\nAll tests complete. Check the session files and log for results.`);
  log(`Log file: ${logFile}`);
}

main().catch(error => {
  log(`Unhandled error: ${error.message}`);
});