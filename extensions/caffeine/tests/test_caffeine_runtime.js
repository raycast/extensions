const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('  RUNNING CAFFEINE WINDOWS RUNTIME TEST SUITE');
console.log('====================================================\n');

const scriptPath = path.resolve('assets/scripts/caffeine-helper.ps1');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function getRunningProcessCount(pid, maxRetries = 6) {
  if (!pid || pid <= 0) return false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      process.kill(pid, 0);
      const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
        windowsHide: true,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      if (out.toLowerCase().includes('powershell')) return true;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function launchHelper(durationSeconds, preventDisplay) {
  const escapedScriptPath = scriptPath.replace(/"/g, '`"');
  const psArgs = [
    "'-NoProfile'",
    "'-NonInteractive'",
    "'-WindowStyle'",
    "'Hidden'",
    "'-ExecutionPolicy'",
    "'Bypass'",
    "'-File'",
    `'"${escapedScriptPath}"'`,
    "'-DurationSeconds'",
    `'${durationSeconds}'`,
    "'-PreventDisplaySleep'",
    `'${preventDisplay ? '1' : '0'}'`,
  ];
  const psCommand = `Start-Process powershell.exe -ArgumentList @(${psArgs.join(',')}) -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;
  const output = execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCommand],
    {
      windowsHide: true,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  );
  const pid = parseInt(output.trim(), 10);
  return pid;
}

function stopHelper(pid) {
  if (!pid || pid <= 0) return;
  try {
    const stopCmd = `
try {
    $e = [System.Threading.EventWaitHandle]::OpenExisting('Local\\Caffeine_Stop_${pid}')
    $e.Set() | Out-Null
    $e.Close()
} catch {}
`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', stopCmd], {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 2000,
    });
  } catch {}

  try {
    execFileSync('taskkill', ['/PID', String(pid), '/F', '/T'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  } catch {}
}

async function runTests() {
  // Test 1: Helper Script Exists
  assert(fs.existsSync(scriptPath), `Helper script exists at ${scriptPath}`);

  // Test 2: Helper Script Syntax / Execution Policy Compatibility
  console.log('\n--- Test 2: Script Execution & Syntax Validation ---');
  const verifyCmd = `& "${scriptPath.replace(/"/g, '`"')}" -DurationSeconds 1 -PreventDisplaySleep 1`;
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', verifyCmd],
    {
      windowsHide: true,
      encoding: 'utf8',
    },
  );
  assert(true, 'Helper script executed 1-second test cleanly without errors');

  // Test 3: Display Sleep Disabled Flag (Only System Awake)
  console.log('\n--- Test 3: Display Sleep Disabled Flag ---');
  const verifyDisplayOffCmd = `& "${scriptPath.replace(/"/g, '`"')}" -DurationSeconds 1 -PreventDisplaySleep 0`;
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', verifyDisplayOffCmd],
    {
      windowsHide: true,
      encoding: 'utf8',
    },
  );
  assert(true, 'Helper script executed with PreventDisplaySleep=0 cleanly');

  // Test 4: Indefinite Mode Helper Spawning & PID Tracking
  console.log('\n--- Test 4: Indefinite Mode Process Spawning ---');
  const pidIndefinite = launchHelper(0, true);
  assert(typeof pidIndefinite === 'number' && pidIndefinite > 0, `Spawned indefinite helper PID: ${pidIndefinite}`);

  const isRunning4 = await getRunningProcessCount(pidIndefinite);
  assert(isRunning4, `Process ${pidIndefinite} is confirmed running indefinitely`);

  // Test 5: Manual Termination (Turn Off)
  console.log('\n--- Test 5: Manual Process Termination (Turn Off) ---');
  stopHelper(pidIndefinite);
  await new Promise((r) => setTimeout(r, 600));
  const isRunningAfterStop = await getRunningProcessCount(pidIndefinite, 1);
  assert(!isRunningAfterStop, `Process ${pidIndefinite} cleanly stopped and no longer exists`);

  // Test 6: Automatic Expiration Lifecycle (Timer Mode)
  console.log('\n--- Test 6: Automatic Expiration Lifecycle (Timer Mode) ---');
  const expirePid = launchHelper(3, true);
  const isStarted6 = await getRunningProcessCount(expirePid);
  assert(isStarted6, `Launched 3s test process ${expirePid}`);
  console.log('Waiting 4.5s for automatic expiration...');
  await new Promise((r) => setTimeout(r, 4500));
  const isRunningAfterExpire = await getRunningProcessCount(expirePid, 1);
  assert(!isRunningAfterExpire, `Process ${expirePid} naturally expired and exited without orphaned processes`);

  // Test 7: Transition: Indefinite -> Timer (Duplicate Helper Prevention)
  console.log('\n--- Test 7: Transition: Indefinite -> Timer ---');
  const pidIndef = launchHelper(0, true);
  assert(await getRunningProcessCount(pidIndef), `Indefinite helper PID ${pidIndef} active`);

  stopHelper(pidIndef);
  const pidTimer = launchHelper(30, true);
  await new Promise((r) => setTimeout(r, 600));

  assert(!(await getRunningProcessCount(pidIndef, 1)), `Old indefinite helper PID ${pidIndef} cleanly terminated`);
  assert(await getRunningProcessCount(pidTimer), `New timer helper PID ${pidTimer} active`);
  stopHelper(pidTimer);

  // Test 8: Transition: Timer -> Indefinite
  console.log('\n--- Test 8: Transition: Timer -> Indefinite ---');
  const pidTimer1 = launchHelper(60, true);
  assert(await getRunningProcessCount(pidTimer1), `Timer helper PID ${pidTimer1} active`);

  stopHelper(pidTimer1);
  const pidIndef2 = launchHelper(0, true);
  await new Promise((r) => setTimeout(r, 600));

  assert(!(await getRunningProcessCount(pidTimer1, 1)), `Old timer helper PID ${pidTimer1} cleanly terminated`);
  assert(await getRunningProcessCount(pidIndef2), `New indefinite helper PID ${pidIndef2} active`);
  stopHelper(pidIndef2);

  // Test 9: Transition: Timer -> Timer Replacement
  console.log('\n--- Test 9: Transition: Timer -> Timer Replacement ---');
  const pidT1 = launchHelper(30, true);
  assert(await getRunningProcessCount(pidT1), `First timer PID ${pidT1} active`);

  stopHelper(pidT1);
  const pidT2 = launchHelper(60, true);
  await new Promise((r) => setTimeout(r, 600));

  assert(!(await getRunningProcessCount(pidT1, 1)), `Replaced timer PID ${pidT1} terminated`);
  assert(await getRunningProcessCount(pidT2), `Replacement timer PID ${pidT2} active`);
  stopHelper(pidT2);

  console.log('\n====================================================');
  console.log('  ALL RUNTIME TESTS PASSED SUCCESSFULLY! (9/9)');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
