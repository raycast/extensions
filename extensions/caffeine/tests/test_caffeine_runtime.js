const Module = require("module");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

console.log("====================================================");
console.log("  RUNNING CAFFEINE WINDOWS RUNTIME TEST SUITE");
console.log("====================================================\n");

const scriptPath = path.resolve("assets/scripts/caffeine-helper.ps1");
const tempDir = path.join(os.tmpdir(), "raycast-caffeine-tests");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Set up controlled mock for @raycast/api so production functions can run under Node test runner
const mockLocalStorage = {
  _store: new Map(),
  async getItem(key) {
    return this._store.get(key);
  },
  async setItem(key, value) {
    this._store.set(key, String(value));
  },
  async removeItem(key) {
    this._store.delete(key);
  },
  clear() {
    this._store.clear();
  },
};

const mockRaycastApi = {
  environment: {
    supportPath: tempDir,
    assetsPath: path.resolve("assets"),
  },
  LocalStorage: mockLocalStorage,
  getPreferenceValues: () => ({ preventDisplaySleep: true }),
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === "@raycast/api") {
    return mockRaycastApi;
  }
  return originalRequire.apply(this, arguments);
};

// Import production compiled functions
const { startCaffeine, stopCaffeine, getCurrentState, STORAGE_KEY } = require("../.tmp/dist/utils/caffeine.js");
const { verifyHelperIdentity, terminateHelperProcess, setCustomVerifier } = require("../.tmp/dist/utils/process.js");

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

function escapePsArg(arg) {
  return arg.replace(/'/g, "''").replace(/"/g, '`"');
}

async function isProcessAlive(pid, maxRetries = 6) {
  if (!pid || pid <= 0) return false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      // Process does not exist
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function launchHelperSync(durationSeconds, preventDisplay) {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const readyFile = path.join(tempDir, `ready_${sessionId}.json`);
  const statusFile = path.join(tempDir, `status_${sessionId}.json`);

  const safeScriptPath = escapePsArg(scriptPath);
  const safeReadyFile = escapePsArg(readyFile);
  const safeStatusFile = escapePsArg(statusFile);

  const psArgs = [
    "'-NoProfile'",
    "'-NonInteractive'",
    "'-WindowStyle'",
    "'Hidden'",
    "'-ExecutionPolicy'",
    "'Bypass'",
    "'-File'",
    `'"${safeScriptPath}"'`,
    "'-DurationSeconds'",
    `'${durationSeconds}'`,
    "'-PreventDisplaySleep'",
    `'${preventDisplay ? "1" : "0"}'`,
    "'-ReadyFile'",
    `'"${safeReadyFile}"'`,
    "'-StatusFile'",
    `'"${safeStatusFile}"'`,
  ];
  const psCommand = `Start-Process powershell.exe -ArgumentList @(${psArgs.join(",")}) -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psCommand],
    {
      windowsHide: true,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  const initialPid = parseInt(output.trim(), 10);

  // Poll for ready file
  const start = Date.now();
  let readyData = null;
  while (Date.now() - start < 5000) {
    if (fs.existsSync(readyFile)) {
      try {
        const raw = fs.readFileSync(readyFile, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.pid === "number") {
          readyData = parsed;
          break;
        }
      } catch {}
    }
    try {
      process.kill(initialPid, 0);
    } catch {
      break;
    }
    execFileSync("powershell.exe", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 50"], { windowsHide: true });
  }

  try {
    if (fs.existsSync(readyFile)) fs.unlinkSync(readyFile);
  } catch {}

  return {
    pid: readyData ? readyData.pid : initialPid,
    startTime: readyData ? readyData.startTime : null,
    statusFile,
    isReady: Boolean(readyData),
  };
}

function verifyHelperProcessSync(pid, expectedStartTime) {
  if (!pid || pid <= 0) return { status: "not_running" };
  try {
    process.kill(pid, 0);
  } catch {
    return { status: "not_running" };
  }
  const safePid = Math.floor(pid);
  const safeExpectedStart = expectedStartTime && expectedStartTime > 0 ? Math.floor(expectedStartTime) : 0;
  const checkCmd = `
$TargetPid = ${safePid}
$ExpectedStart = ${safeExpectedStart}
try {
    $proc = [System.Diagnostics.Process]::GetProcessById($TargetPid)
    if ($proc.ProcessName -notlike '*powershell*' -and $proc.ProcessName -notlike '*pwsh*') {
        exit 2
    }
    if ($ExpectedStart -gt 0) {
        $procStartMs = [DateTimeOffset]::new($proc.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()
        if ([Math]::Abs($procStartMs - $ExpectedStart) -gt 3000) {
            exit 3
        }
    }
    $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $TargetPid" -ErrorAction SilentlyContinue
    if (-not $cim -or $cim.CommandLine -notlike '*caffeine-helper*') {
        exit 4
    }
    exit 0
} catch {
    exit 1
}
`;
  try {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", checkCmd],
      {
        windowsHide: true,
        stdio: "ignore",
        timeout: 3000,
      },
    );
    return { status: "verified" };
  } catch (err) {
    if (err && typeof err.status === "number") {
      if (err.status === 1) return { status: "not_running" };
      if (err.status >= 2 && err.status <= 4) return { status: "mismatch" };
    }
    return { status: "lookup_failed", error: err };
  }
}

function stopHelper(pid, expectedStartTime, statusFile) {
  if (!pid || pid <= 0) return;

  const verification = verifyHelperProcessSync(pid, expectedStartTime);
  if (verification.status === "not_running") {
    if (statusFile && fs.existsSync(statusFile)) {
      try {
        fs.unlinkSync(statusFile);
      } catch {}
    }
    return;
  }

  if (verification.status === "mismatch") {
    console.log(`[Safety Guard] Process ${pid} is not confirmed Caffeine helper. Skipping stop.`);
    if (statusFile && fs.existsSync(statusFile)) {
      try {
        fs.unlinkSync(statusFile);
      } catch {}
    }
    return;
  }

  if (verification.status === "lookup_failed") {
    throw new Error(`Unable to verify helper process identity: lookup failed for PID ${pid}`);
  }

  try {
    const stopCmd = `
try {
    $e = [System.Threading.EventWaitHandle]::OpenExisting('Local\\Caffeine_Stop_${pid}')
    $e.Set() | Out-Null
    $e.Close()
} catch {}
`;
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", stopCmd],
      {
        windowsHide: true,
        stdio: "ignore",
        timeout: 2000,
      },
    );
  } catch {}

  // Wait grace period
  let alive = true;
  for (let i = 0; i < 5; i++) {
    try {
      process.kill(pid, 0);
      execFileSync("powershell.exe", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 100"], {
        windowsHide: true,
      });
    } catch {
      alive = false;
      break;
    }
  }

  if (alive) {
    const recheck = verifyHelperProcessSync(pid, expectedStartTime);
    if (recheck.status === "verified") {
      try {
        execFileSync("taskkill", ["/PID", String(pid), "/F", "/T"], {
          windowsHide: true,
          stdio: "ignore",
        });
      } catch {}
    }
  }

  if (statusFile && fs.existsSync(statusFile)) {
    try {
      fs.unlinkSync(statusFile);
    } catch {}
  }
}

async function runTests() {
  // Test 1: Helper Script Exists
  assert(fs.existsSync(scriptPath), `Helper script exists at ${scriptPath}`);

  // Test 2: Helper Script Syntax / Execution Policy Compatibility
  console.log("\n--- Test 2: Script Execution & Syntax Validation ---");
  const verifyCmd = `& "${escapePsArg(scriptPath)}" -DurationSeconds 1 -PreventDisplaySleep 1`;
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", verifyCmd],
    {
      windowsHide: true,
      encoding: "utf8",
    },
  );
  assert(true, "Helper script executed 1-second test cleanly without errors");

  // Test 3: Display Sleep Disabled Flag (Only System Awake)
  console.log("\n--- Test 3: Display Sleep Disabled Flag ---");
  const verifyDisplayOffCmd = `& "${escapePsArg(scriptPath)}" -DurationSeconds 1 -PreventDisplaySleep 0`;
  execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", verifyDisplayOffCmd],
    {
      windowsHide: true,
      encoding: "utf8",
    },
  );
  assert(true, "Helper script executed with PreventDisplaySleep=0 cleanly");

  // Test 4: Indefinite Mode Helper Spawning & Ready Signal
  console.log("\n--- Test 4: Indefinite Mode Process Spawning & Ready Signal ---");
  const helper4 = launchHelperSync(0, true);
  assert(typeof helper4.pid === "number" && helper4.pid > 0, `Spawned indefinite helper PID: ${helper4.pid}`);
  assert(helper4.isReady, `Helper ${helper4.pid} sent confirmed ready signal`);
  assert(typeof helper4.startTime === "number", `Captured helper process start time: ${helper4.startTime}`);

  const isRunning4 = await isProcessAlive(helper4.pid);
  assert(isRunning4, `Process ${helper4.pid} is confirmed running indefinitely`);

  // Test 5: Manual Termination (Turn Off) with Identity Verification
  console.log("\n--- Test 5: Manual Process Termination (Turn Off) ---");
  stopHelper(helper4.pid, helper4.startTime, helper4.statusFile);
  await new Promise((r) => setTimeout(r, 600));
  const isRunningAfterStop = await isProcessAlive(helper4.pid, 1);
  assert(!isRunningAfterStop, `Process ${helper4.pid} cleanly stopped and no longer exists`);

  // Test 6: Automatic Expiration Lifecycle (Timer Mode)
  console.log("\n--- Test 6: Automatic Expiration Lifecycle (Timer Mode) ---");
  const helper6 = launchHelperSync(3, true);
  const isStarted6 = await isProcessAlive(helper6.pid);
  assert(isStarted6, `Launched 3s test process ${helper6.pid}`);
  console.log("Waiting 4.5s for automatic expiration...");
  await new Promise((r) => setTimeout(r, 4500));
  const isRunningAfterExpire = await isProcessAlive(helper6.pid, 1);
  assert(!isRunningAfterExpire, `Process ${helper6.pid} naturally expired and exited without orphaned processes`);

  // Test 7: Transition: Indefinite -> Timer (Duplicate Helper Prevention)
  console.log("\n--- Test 7: Transition: Indefinite -> Timer ---");
  const helper7Indef = launchHelperSync(0, true);
  assert(await isProcessAlive(helper7Indef.pid), `Indefinite helper PID ${helper7Indef.pid} active`);

  stopHelper(helper7Indef.pid, helper7Indef.startTime, helper7Indef.statusFile);
  const helper7Timer = launchHelperSync(30, true);
  await new Promise((r) => setTimeout(r, 600));

  assert(
    !(await isProcessAlive(helper7Indef.pid, 1)),
    `Old indefinite helper PID ${helper7Indef.pid} cleanly terminated`,
  );
  assert(await isProcessAlive(helper7Timer.pid), `New timer helper PID ${helper7Timer.pid} active`);
  stopHelper(helper7Timer.pid, helper7Timer.startTime, helper7Timer.statusFile);

  // Test 8: Transition: Timer -> Indefinite
  console.log("\n--- Test 8: Transition: Timer -> Indefinite ---");
  const helper8Timer = launchHelperSync(60, true);
  assert(await isProcessAlive(helper8Timer.pid), `Timer helper PID ${helper8Timer.pid} active`);

  stopHelper(helper8Timer.pid, helper8Timer.startTime, helper8Timer.statusFile);
  const helper8Indef = launchHelperSync(0, true);
  await new Promise((r) => setTimeout(r, 600));

  assert(!(await isProcessAlive(helper8Timer.pid, 1)), `Old timer helper PID ${helper8Timer.pid} cleanly terminated`);
  assert(await isProcessAlive(helper8Indef.pid), `New indefinite helper PID ${helper8Indef.pid} active`);
  stopHelper(helper8Indef.pid, helper8Indef.startTime, helper8Indef.statusFile);

  // Test 9: Transition: Timer -> Timer Replacement
  console.log("\n--- Test 9: Transition: Timer -> Timer Replacement ---");
  const helper9T1 = launchHelperSync(30, true);
  assert(await isProcessAlive(helper9T1.pid), `First timer PID ${helper9T1.pid} active`);

  stopHelper(helper9T1.pid, helper9T1.startTime, helper9T1.statusFile);
  const helper9T2 = launchHelperSync(60, true);
  await new Promise((r) => setTimeout(r, 600));

  assert(!(await isProcessAlive(helper9T1.pid, 1)), `Replaced timer PID ${helper9T1.pid} terminated`);
  assert(await isProcessAlive(helper9T2.pid), `Replacement timer PID ${helper9T2.pid} active`);
  stopHelper(helper9T2.pid, helper9T2.startTime, helper9T2.statusFile);

  // Test 10: Unrelated Process Protection
  console.log("\n--- Test 10: Unrelated Process Protection ---");
  const dummyOutput = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Start-Process powershell.exe -ArgumentList '-NoProfile','-Command','Start-Sleep -Seconds 15' -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id",
    ],
    { encoding: "utf8" },
  );
  const dummyPid = parseInt(dummyOutput.trim(), 10);
  assert(await isProcessAlive(dummyPid), `Spawned unrelated PowerShell dummy process with PID ${dummyPid}`);

  // Attempt to terminate dummyPid with mismatched expectedStartTime and non-caffeine identity
  stopHelper(dummyPid, 123456789, null);
  await new Promise((r) => setTimeout(r, 400));

  // Dummy process must STILL be alive!
  const dummyStillAlive = await isProcessAlive(dummyPid, 1);
  assert(dummyStillAlive, `Safety Guard Verified: Unrelated process ${dummyPid} was NOT killed`);

  // Clean up dummy process
  try {
    execFileSync("taskkill", ["/PID", String(dummyPid), "/F", "/T"], { stdio: "ignore" });
  } catch {}

  // Test 11: Production startCaffeine() Overlapping Calls (Issue 1 & 3)
  console.log("\n--- Test 11: Production startCaffeine() Overlapping Calls (Issue 1 & 3) ---");
  mockLocalStorage.clear();

  // Trigger two real startCaffeine() calls concurrently
  const [res1, res2] = await Promise.all([startCaffeine(30), startCaffeine(60)]);

  assert(res1 && res1.pid, `First start call resolved with PID ${res1.pid}`);
  assert(res2 && res2.pid, `Second start call resolved with PID ${res2.pid}`);
  assert(res1.pid !== res2.pid, "Two distinct helper processes were spawned");

  // State must track the winning helper
  const currentState11 = await getCurrentState();
  assert(currentState11.active === true, "Current state is active");
  const activePid = currentState11.pid;
  const replacedPid = activePid === res1.pid ? res2.pid : res1.pid;

  // Wait grace period for termination of the replaced helper
  await new Promise((r) => setTimeout(r, 800));
  assert(!(await isProcessAlive(replacedPid, 1)), `Replaced helper ${replacedPid} was cleanly terminated`);
  assert(await isProcessAlive(activePid), `Active helper ${activePid} is still running`);

  // Clean up active helper via production stopCaffeine()
  await stopCaffeine();
  assert(!(await isProcessAlive(activePid, 1)), `Active helper ${activePid} was stopped by stopCaffeine()`);
  const finalState11 = await getCurrentState();
  assert(finalState11.active === false, "State is cleanly inactive after stopCaffeine()");

  // Test 12: Production getCurrentState() Expiry Does Not Stop Replaced Timer (Issue 1 & 3)
  console.log("\n--- Test 12: Production getCurrentState() Expiry Recheck (Issue 1 & 3) ---");
  mockLocalStorage.clear();

  // 1. Seed storage with an expired session A
  const expiredPid = 88888;
  const expiredSessionA = {
    active: true,
    pid: expiredPid,
    processStartTime: Date.now() - 60000,
    statusFilePath: path.join(tempDir, "status_expired_a.json"),
    startedAt: Date.now() - 60000,
    expiresAt: Date.now() - 1000, // Expired 1 second ago
    durationSeconds: 60,
    preventDisplaySleep: true,
  };
  await mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(expiredSessionA));

  // 2. Start replacement session B using production startCaffeine()
  const sessionB = await startCaffeine(60);
  assert(await isProcessAlive(sessionB.pid), `Replacement session B (PID ${sessionB.pid}) is active`);

  // 3. Invoke production getCurrentState() - rechecks under lock and must NOT stop session B
  const stateAfterCheck = await getCurrentState();
  assert(stateAfterCheck.active === true, "Session remains active after expiry check");
  assert(stateAfterCheck.pid === sessionB.pid, "Session B PID is preserved in state");
  assert(await isProcessAlive(sessionB.pid), "Session B helper is verified still running");

  // Clean up session B
  await stopCaffeine();
  assert(!(await isProcessAlive(sessionB.pid, 1)), "Session B cleanly terminated");

  // Test 13: Production stopCaffeine() Preserves State on Identity Lookup Failure (Issue 2 & 3)
  console.log("\n--- Test 13: Production stopCaffeine() Identity Lookup Failure (Issue 2 & 3) ---");
  mockLocalStorage.clear();

  // 1. Start a real helper using production startCaffeine()
  const liveState = await startCaffeine(0);
  assert(await isProcessAlive(liveState.pid), `Live helper ${liveState.pid} running`);

  // 2. Set controlled process response: simulate identity lookup timeout/failure
  setCustomVerifier(async () => ({
    status: "lookup_failed",
    error: new Error("Simulated PowerShell lookup timeout"),
  }));

  // 3. Call production stopCaffeine() - must throw and NOT clear state or delete status file!
  let errorCaught = false;
  try {
    await stopCaffeine();
  } catch (err) {
    errorCaught = true;
    assert(err.message.includes("Unable to verify helper process identity"), `Error message matches: ${err.message}`);
  }
  assert(errorCaught, "stopCaffeine() threw error on lookup failure instead of swallowing it");

  // 4. Verify state and status file were preserved!
  const preservedState = await getCurrentState();
  assert(preservedState.active === true, "State was preserved as active in LocalStorage");
  assert(preservedState.pid === liveState.pid, "Helper PID was preserved in LocalStorage");
  assert(fs.existsSync(liveState.statusFilePath), "Status file was preserved on disk");

  // 5. Restore normal verifier and stop helper cleanly
  setCustomVerifier(null);
  await stopCaffeine();
  assert(!(await isProcessAlive(liveState.pid, 1)), "Helper cleanly stopped after verifier restored");
  const finalState13 = await getCurrentState();
  assert(finalState13.active === false, "State cleanly marked inactive after successful stop");

  console.log("\n====================================================");
  console.log("  ALL RUNTIME TESTS PASSED SUCCESSFULLY! (13/13)");
  console.log("====================================================\n");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
