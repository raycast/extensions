import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";

import {
  RegisteredVMError,
  createRegisteredVMs,
  resolveVMQuery,
  type RegisteredVM,
  type VMControl,
} from "../src/registered-vms";
import { MacOSParallelsHost, ParallelsHostError, type ParallelsHost } from "../src/internal/parallels-host";

const FEDORA_ID = "f518b112-29d4-41fe-91ad-ca2d432757c9";
const ARCH_ID = "73aded72-8e36-4fa9-96dd-1a223977c019";
const HANG_COMMAND_PATH = join(__dirname, "fixtures", "hang-command.sh");

type FocusResult = number | null | Error | Promise<number | null>;

function vmRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ID: `{${FEDORA_ID.toUpperCase()}}`,
    Name: "Fedora Linux",
    Type: "VM",
    Template: "no",
    Home: "/Users/test/Parallels/Fedora Linux.pvm/",
    State: "stopped",
    OS: "Fedora Linux",
    Description: "Main workstation",
    ...overrides,
  };
}

function registryPayload(...records: Record<string, unknown>[]): string {
  return JSON.stringify(records.length > 0 ? records : [vmRecord()]);
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

class FakeHost implements ParallelsHost {
  registryPayload = registryPayload();
  registryError: Error | undefined;
  focusResults: FocusResult[] = [null];
  openError: Error | undefined;
  activationError: Error | undefined;
  controlError: Error | undefined;
  clock = 0;

  readonly registryCalls: number[] = [];
  readonly focusCalls: string[] = [];
  readonly openedHomes: string[] = [];
  readonly activatedPIDs: number[] = [];
  readonly prlctlCalls: string[][] = [];
  readonly sleeps: number[] = [];

  async registryJSON(): Promise<string> {
    this.registryCalls.push(this.registryCalls.length + 1);
    if (this.registryError) throw this.registryError;
    return this.registryPayload;
  }

  async focusProxyPID(vmID: string): Promise<number | null> {
    this.focusCalls.push(vmID);
    const result = this.focusResults.length > 1 ? this.focusResults.shift() : this.focusResults[0];
    if (result instanceof Error) throw result;
    return (await result) ?? null;
  }

  async openVMHome(home: string): Promise<void> {
    this.openedHomes.push(home);
    if (this.openError) throw this.openError;
  }

  async activate(pid: number): Promise<void> {
    this.activatedPIDs.push(pid);
    if (this.activationError) throw this.activationError;
  }

  async runPrlctl(args: string[]): Promise<void> {
    this.prlctlCalls.push([...args]);
    if (this.controlError) throw this.controlError;
  }

  async shutdown(): Promise<void> {}

  now(): number {
    return this.clock;
  }

  async sleep(ms: number): Promise<void> {
    this.sleeps.push(ms);
    this.clock += ms;
  }
}

async function rejectsWithCode(
  operation: Promise<unknown>,
  code: RegisteredVMError["code"],
): Promise<RegisteredVMError> {
  try {
    await operation;
  } catch (error) {
    assert.ok(error instanceof RegisteredVMError);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`Expected RegisteredVMError with code ${code}`);
}

async function rejectsWithHostCode(
  operation: Promise<unknown>,
  code: ParallelsHostError["code"],
): Promise<ParallelsHostError> {
  try {
    await operation;
  } catch (error) {
    assert.ok(error instanceof ParallelsHostError);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`Expected ParallelsHostError with code ${code}`);
}

test("snapshot normalizes UUID, name, home, state, and filters templates", async () => {
  const host = new FakeHost();
  host.registryPayload = registryPayload(
    vmRecord({ Name: "  Fedora   Linux  ", Home: "/VMs/Fedora.pvm///", State: "RUNNING" }),
    vmRecord({ ID: `{${ARCH_ID}}`, Name: "Ignored Template", Template: "yes", Home: null }),
  );

  const snapshot = await createRegisteredVMs(host).snapshot();

  assert.deepEqual(snapshot, [
    {
      id: FEDORA_ID,
      name: "Fedora Linux",
      home: "/VMs/Fedora.pvm",
      state: "running",
      os: "Fedora Linux",
      description: "Main workstation",
    },
  ]);
});

test("snapshot supports Home path and maps transition states", async () => {
  const host = new FakeHost();
  host.registryPayload = registryPayload(
    vmRecord({ Home: null, "Home path": "/VMs/Fedora.pvm/config.pvs", State: "resuming" }),
  );

  const [vm] = await createRegisteredVMs(host).snapshot();

  assert.equal(vm.home, "/VMs/Fedora.pvm");
  assert.equal(vm.state, "transitioning");
});

test("snapshot fails closed on invalid JSON, records, and UUIDs", async (context) => {
  const cases: Array<[string, string]> = [
    ["invalid JSON", "not-json"],
    ["non-array root", "{}"],
    ["non-object record", JSON.stringify(["Fedora"])],
    ["missing required field", registryPayload(vmRecord({ Home: null }))],
    ["invalid UUID", registryPayload(vmRecord({ ID: "not-a-uuid" }))],
    ["invalid template marker", registryPayload(vmRecord({ Template: "sometimes" }))],
  ];

  for (const [name, payload] of cases) {
    await context.test(name, async () => {
      const host = new FakeHost();
      host.registryPayload = payload;
      await rejectsWithCode(createRegisteredVMs(host).snapshot(), "registry-invalid");
    });
  }
});

test("snapshot rejects duplicate normalized UUIDs but permits duplicate names", async () => {
  const duplicateIDHost = new FakeHost();
  duplicateIDHost.registryPayload = registryPayload(
    vmRecord(),
    vmRecord({ ID: FEDORA_ID.toUpperCase(), Name: "Other Name" }),
  );
  await rejectsWithCode(createRegisteredVMs(duplicateIDHost).snapshot(), "duplicate-vm-id");

  const duplicateNameHost = new FakeHost();
  duplicateNameHost.registryPayload = registryPayload(
    vmRecord(),
    vmRecord({ ID: ARCH_ID, Name: "Fedora Linux", Home: "/VMs/Arch.pvm" }),
  );
  const snapshot = await createRegisteredVMs(duplicateNameHost).snapshot();
  assert.equal(snapshot.length, 2);
});

test("running VM activates its UUID focus proxy without opening its home", async () => {
  const host = new FakeHost();
  host.registryPayload = registryPayload(vmRecord({ State: "running" }));
  host.focusResults = [86280];

  const outcome = await createRegisteredVMs(host).openOrSwitch(`{${FEDORA_ID.toUpperCase()}}`);

  assert.equal(outcome.action, "switched");
  assert.equal(outcome.vm.id, FEDORA_ID);
  assert.deepEqual(host.focusCalls, [FEDORA_ID]);
  assert.deepEqual(host.openedHomes, []);
  assert.deepEqual(host.activatedPIDs, [86280]);
});

test("stopped VM opens in the background, polls every 250ms, then activates", async () => {
  const host = new FakeHost();
  host.focusResults = [null, null, 8123];

  const outcome = await createRegisteredVMs(host).openOrSwitch(FEDORA_ID);

  assert.equal(outcome.action, "started-and-switched");
  assert.deepEqual(host.openedHomes, ["/Users/test/Parallels/Fedora Linux.pvm"]);
  assert.deepEqual(host.sleeps, [250, 250]);
  assert.deepEqual(host.activatedPIDs, [8123]);
});

test("suspended VM reports resume outcome after helper polling", async () => {
  const host = new FakeHost();
  host.registryPayload = registryPayload(vmRecord({ State: "suspended" }));
  host.focusResults = [null, 8123];

  const outcome = await createRegisteredVMs(host).openOrSwitch(FEDORA_ID);

  assert.equal(outcome.action, "resumed-and-switched");
  assert.deepEqual(host.sleeps, [250]);
});

test("concurrent opens for the same normalized UUID share one operation", async () => {
  const host = new FakeHost();
  host.registryPayload = registryPayload(vmRecord({ State: "running" }));
  const gate = deferred<number | null>();
  host.focusResults = [gate.promise];
  const registeredVMs = createRegisteredVMs(host);

  const first = registeredVMs.openOrSwitch(FEDORA_ID);
  const second = registeredVMs.openOrSwitch(`{${FEDORA_ID.toUpperCase()}}`);

  assert.equal(first, second);
  gate.resolve(86280);
  const [firstOutcome, secondOutcome] = await Promise.all([first, second]);
  assert.equal(firstOutcome, secondOutcome);
  assert.equal(host.registryCalls.length, 1);
  assert.deepEqual(host.activatedPIDs, [86280]);

  host.focusResults = [86280];
  const later = registeredVMs.openOrSwitch(FEDORA_ID);
  assert.notEqual(later, first);
  await later;
  assert.equal(host.registryCalls.length, 2);
});

test("focus proxy ambiguity remains a discriminable domain error", async () => {
  const host = new FakeHost();
  host.registryPayload = registryPayload(vmRecord({ State: "running" }));
  host.focusResults = [
    new ParallelsHostError("focus-proxy-ambiguous", "duplicate helpers", {
      vmID: FEDORA_ID,
      pids: [12, 34],
    }),
  ];

  const error = await rejectsWithCode(createRegisteredVMs(host).openOrSwitch(FEDORA_ID), "focus-proxy-ambiguous");

  assert.equal(error.cause instanceof ParallelsHostError, true);
  assert.deepEqual(host.openedHomes, []);
  assert.deepEqual(host.activatedPIDs, []);
});

test("helper polling uses the 30 second timeout and clears failed in-flight work", async () => {
  const host = new FakeHost();
  host.focusResults = [null];
  const registeredVMs = createRegisteredVMs(host);

  const first = registeredVMs.openOrSwitch(FEDORA_ID);
  await rejectsWithCode(first, "start-timeout");

  assert.equal(
    host.sleeps.reduce((total, duration) => total + duration, 0),
    30_000,
  );
  assert.equal(
    host.sleeps.every((duration) => duration === 250),
    true,
  );
  assert.deepEqual(host.activatedPIDs, []);

  host.focusResults = [9012];
  const retry = registeredVMs.openOrSwitch(FEDORA_ID);
  assert.notEqual(retry, first);
  await retry;
  assert.deepEqual(host.activatedPIDs, [9012]);
});

test("resolveVMQuery accepts UUID, exact names, and unique partial names", () => {
  const vms: RegisteredVM[] = [
    {
      id: FEDORA_ID,
      name: "Fedora Linux",
      home: "/VMs/Fedora.pvm",
      state: "running",
    },
  ];

  assert.equal(resolveVMQuery(vms, `{${FEDORA_ID.toUpperCase()}}`).id, FEDORA_ID);
  assert.equal(resolveVMQuery(vms, "  fedora   linux ").id, FEDORA_ID);
  assert.equal(resolveVMQuery(vms, "fedora").id, FEDORA_ID);
});

test("resolveVMQuery rejects empty, missing, and duplicate names", () => {
  const duplicateNames: RegisteredVM[] = [
    { id: FEDORA_ID, name: "Fedora", home: "/VMs/Fedora.pvm", state: "running" },
    { id: ARCH_ID, name: "FEDORA", home: "/VMs/Arch.pvm", state: "stopped" },
  ];

  assert.throws(
    () => resolveVMQuery(duplicateNames, "  "),
    (error) => {
      return error instanceof RegisteredVMError && error.code === "vm-query-empty";
    },
  );
  assert.throws(
    () => resolveVMQuery(duplicateNames, "Debian"),
    (error) => {
      return error instanceof RegisteredVMError && error.code === "vm-query-not-found";
    },
  );
  assert.throws(
    () => resolveVMQuery(duplicateNames, "fedora"),
    (error) => {
      return error instanceof RegisteredVMError && error.code === "vm-query-ambiguous";
    },
  );
});

test("resolveVMQuery rejects ambiguous partial names", () => {
  const vms: RegisteredVM[] = [
    { id: FEDORA_ID, name: "Fedora Linux", home: "/VMs/Fedora.pvm", state: "running" },
    { id: ARCH_ID, name: "Kali-Linux", home: "/VMs/Kali.pvm", state: "stopped" },
  ];

  assert.throws(
    () => resolveVMQuery(vms, "linux"),
    (error) => {
      return error instanceof RegisteredVMError && error.code === "vm-query-ambiguous";
    },
  );
});

test("malicious VM names remain data and never become control arguments", async () => {
  const maliciousName = 'Fedora"; touch /tmp/pwned; #';
  const host = new FakeHost();
  host.registryPayload = registryPayload(vmRecord({ Name: maliciousName, State: "running" }));
  host.focusResults = [86280];
  const registeredVMs = createRegisteredVMs(host);

  const snapshot = await registeredVMs.snapshot();
  assert.equal(resolveVMQuery(snapshot, maliciousName).id, FEDORA_ID);
  await registeredVMs.openOrSwitch(FEDORA_ID);
  await registeredVMs.control(FEDORA_ID, "suspend");

  assert.deepEqual(host.focusCalls, [FEDORA_ID]);
  assert.deepEqual(host.prlctlCalls, [["suspend", FEDORA_ID]]);
});

test("control maps its closed action set to prlctl arguments by UUID", async () => {
  const host = new FakeHost();
  const registeredVMs = createRegisteredVMs(host);
  const cases: Array<[VMControl, string[]]> = [
    ["suspend", ["suspend", FEDORA_ID]],
    ["reset", ["reset", FEDORA_ID]],
    ["force-stop", ["stop", FEDORA_ID, "--kill"]],
  ];

  for (const [action, expected] of cases) {
    await registeredVMs.control(`{${FEDORA_ID.toUpperCase()}}`, action);
    assert.deepEqual(host.prlctlCalls.at(-1), expected);
  }

  await rejectsWithCode(registeredVMs.control(FEDORA_ID, "delete" as VMControl), "invalid-control");
  assert.equal(host.prlctlCalls.length, cases.length);
});

test("suspended force stop awaits start before kill and rejects stale state", async () => {
  const suspendedHost = new FakeHost();
  suspendedHost.registryPayload = registryPayload(vmRecord({ State: "suspended" }));
  const suspendedVMs = createRegisteredVMs(suspendedHost);

  await suspendedVMs.control(FEDORA_ID, "start-then-force-stop");

  assert.deepEqual(suspendedHost.prlctlCalls, [
    ["start", FEDORA_ID],
    ["stop", FEDORA_ID, "--kill"],
  ]);

  const runningHost = new FakeHost();
  runningHost.registryPayload = registryPayload(vmRecord({ State: "running" }));
  await rejectsWithCode(
    createRegisteredVMs(runningHost).control(FEDORA_ID, "start-then-force-stop"),
    "invalid-control",
  );
  assert.deepEqual(runningHost.prlctlCalls, []);
});

test("unknown UUID is rejected before open or control side effects", async () => {
  const host = new FakeHost();
  const missingID = "00000000-0000-0000-0000-000000000000";
  const registeredVMs = createRegisteredVMs(host);

  await rejectsWithCode(registeredVMs.openOrSwitch(missingID), "vm-not-found");
  await rejectsWithCode(registeredVMs.control(missingID, "suspend"), "vm-not-found");

  assert.deepEqual(host.openedHomes, []);
  assert.deepEqual(host.activatedPIDs, []);
  assert.deepEqual(host.prlctlCalls, []);
});

test("host hard-stops hanging execFile and stdin commands", async (context) => {
  const timeoutMs = 40;

  await context.test("execFile", async () => {
    const host = new MacOSParallelsHost({ prlctlPath: HANG_COMMAND_PATH, commandTimeoutMs: timeoutMs });
    const error = await rejectsWithHostCode(host.registryJSON(), "command-timeout");

    assert.equal(error.details.timeoutMs, timeoutMs);
  });

  await context.test("spawn with stdin", async () => {
    const host = new MacOSParallelsHost({ osascriptPath: HANG_COMMAND_PATH, commandTimeoutMs: timeoutMs });
    const error = await rejectsWithHostCode(host.focusProxyPID(FEDORA_ID), "command-timeout");

    assert.equal(error.details.timeoutMs, timeoutMs);
  });
});
