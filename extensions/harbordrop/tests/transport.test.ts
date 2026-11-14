import assert from "node:assert/strict";
import test from "node:test";
import {
  chmod,
  link,
  lstat,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import {
  MAX_METADATA_BYTES,
  PublicationError,
  publishRequest,
  readJSON,
} from "../src/lib/files";
import { IntegrationError } from "../src/lib/errors";
import {
  loadSharedState,
  makeRequest,
  pendingReference,
  pollReceipt,
  readReceipt,
  submitRequest as submitVerifiedRequest,
} from "../src/lib/transport";
import { fixtureRoot, jsonFile, randomUUID, receipt } from "./fixtures";
import type { IntegrationRequest } from "../src/lib/contract";

const fixtureApp = {
  name: "HarborDrop",
  path: "/fixture/HarborDrop.app",
  bundleId: "com.hjm.harbordrop",
};
const verifiedFixture = async () => fixtureApp;
function submitRequest(request: IntegrationRequest, root: string) {
  return submitVerifiedRequest(request, fixtureApp, {
    root,
    verifyApp: verifiedFixture,
  });
}

test("missing root is never created and disabled descriptor blocks writes", async () => {
  const root = await fixtureRoot();
  try {
    const missing = join(root, "missing");
    await assert.rejects(loadSharedState(missing), { code: "missing" });
    await assert.rejects(lstat(missing), { code: "ENOENT" });
    const state = await loadSharedState(root);
    const request = makeRequest(state, "reviewAddURL", {
      url: "https://example.com/file",
    });
    await jsonFile(root, "descriptor.json", {
      ...state.descriptor,
      enabled: false,
    });
    await assert.rejects(submitRequest(request, root), {
      code: "integrationDisabled",
    });
    assert.deepEqual(await readdir(join(root, "requests")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});
test("publication is exclusive, complete, and private under concurrent same IDs", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.com/file?private=value",
    });
    const results = await Promise.allSettled([
      submitRequest(request, root),
      submitRequest(request, root),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const file = join(root, "requests", `${request.requestID}.json`);
    assert.deepEqual(JSON.parse(await readFile(file, "utf8")), request);
    assert.equal((await lstat(file)).mode & 0o777, 0o600);
    assert.equal((await lstat(file)).nlink, 1);
    assert.deepEqual(await readdir(join(root, "requests")), [
      `${request.requestID}.json`,
    ]);
    assert.equal(
      JSON.stringify(pendingReference(request)).includes("private=value"),
      false,
    );
  } finally {
    await rm(root, { recursive: true });
  }
});
test("state reader rejects symlinks, hardlinks, public permissions, and oversized JSON", async () => {
  const root = await fixtureRoot();
  try {
    await unlink(join(root, "state.json"));
    await symlink(join(root, "descriptor.json"), join(root, "state.json"));
    await assert.rejects(readJSON(root, "state.json", MAX_METADATA_BYTES), {
      code: "unreadable",
    });
    await unlink(join(root, "state.json"));
    await link(join(root, "descriptor.json"), join(root, "state.json"));
    await assert.rejects(readJSON(root, "state.json", MAX_METADATA_BYTES), {
      code: "unreadable",
    });
    await unlink(join(root, "state.json"));
    await writeFile(join(root, "state.json"), "{}", { mode: 0o644 });
    await assert.rejects(readJSON(root, "state.json", MAX_METADATA_BYTES), {
      code: "unreadable",
    });
    await chmod(join(root, "state.json"), 0o600);
    await writeFile(join(root, "state.json"), "x".repeat(1025));
    await assert.rejects(readJSON(root, "state.json", 1024), {
      code: "unreadable",
    });
  } finally {
    await rm(root, { recursive: true });
  }
});
test("symlinked roots and inboxes cannot be used to publish elsewhere", async () => {
  const root = await fixtureRoot();
  try {
    await symlink(root, join(root, "alias"));
    await assert.rejects(
      readJSON(join(root, "alias"), "descriptor.json", 1024),
      { code: "unreadable" },
    );
    await rm(join(root, "requests"), { recursive: true });
    await symlink(join(root, "receipts"), join(root, "requests"));
    await assert.rejects(publishRequest(root, randomUUID(), "{}"), {
      code: "unreadable",
    });
    assert.deepEqual(await readdir(join(root, "receipts")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});
test("timeout checks the same receipt without creating or resending a request", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.com/file",
    });
    const result = await pollReceipt(pendingReference(request), {
      root,
      timeoutMs: 1,
    });
    assert.equal(result.timedOut, true);
    assert.equal(result.receipt, undefined);
    assert.deepEqual(await readdir(join(root, "requests")), []);
    await jsonFile(
      root,
      `receipts/${request.requestID}.json`,
      receipt(request.requestID, "awaitingUser"),
    );
    const awaiting = await pollReceipt(pendingReference(request), {
      root,
      timeoutMs: 1,
    });
    assert.equal(awaiting.timedOut, true);
    assert.equal(awaiting.receipt?.status, "awaitingUser");
    await jsonFile(
      root,
      `receipts/${request.requestID}.json`,
      receipt(request.requestID),
    );
    assert.equal(
      (await pollReceipt(pendingReference(request), { root, timeoutMs: 1 }))
        .timedOut,
      false,
    );
  } finally {
    await rm(root, { recursive: true });
  }
});
test("receipt ID, epoch, known hash, and revision mismatches are rejected", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.com/file",
    });
    const pending = pendingReference(request);
    for (const invalid of [
      { ...receipt(request.requestID), requestID: randomUUID() },
      { ...receipt(request.requestID), namespaceEpoch: randomUUID() },
    ]) {
      await jsonFile(root, `receipts/${request.requestID}.json`, invalid);
      await assert.rejects(readReceipt(pending, root), {
        code: "requestConflict",
      });
    }
    await jsonFile(
      root,
      `receipts/${request.requestID}.json`,
      receipt(request.requestID),
    );
    await assert.rejects(
      readReceipt({ ...pending, payloadHash: "b".repeat(64) }, root),
      { code: "requestConflict" },
    );
    await assert.rejects(
      readReceipt({ ...pending, receiptRevision: 4 }, root),
      { code: "requestConflict" },
    );
  } finally {
    await rm(root, { recursive: true });
  }
});
test("aborting polling does not cancel, erase, or resend the app request", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.com/file",
    });
    await submitRequest(request, root);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      pollReceipt(pendingReference(request), {
        root,
        signal: controller.signal,
      }),
      { code: "cancelled" },
    );
    assert.deepEqual(await readdir(join(root, "requests")), [
      `${request.requestID}.json`,
    ]);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("aborting during a receipt read prevents delivery of a terminal result", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.com/file",
    });
    const value = receipt(request.requestID, "failed");
    await jsonFile(root, `receipts/${request.requestID}.json`, value);
    const controller = new AbortController();
    let delivered = false;
    const polling = pollReceipt(pendingReference(request), {
      root,
      signal: controller.signal,
      onReceipt: () => {
        delivered = true;
      },
    });
    controller.abort();

    await assert.rejects(polling, { code: "cancelled" });
    assert.equal(delivered, false);
    assert.equal(
      await readFile(
        join(root, "receipts", `${request.requestID}.json`),
        "utf8",
      ),
      JSON.stringify(value),
    );
    assert.deepEqual(await readdir(join(root, "requests")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("aborting from a terminal receipt callback rejects instead of completing polling", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.com/file",
    });
    const value = receipt(request.requestID, "failed");
    await jsonFile(root, `receipts/${request.requestID}.json`, value);
    const controller = new AbortController();
    let delivered = 0;
    await assert.rejects(
      pollReceipt(pendingReference(request), {
        root,
        signal: controller.signal,
        onReceipt: () => {
          delivered += 1;
          controller.abort();
        },
      }),
      { code: "cancelled" },
    );

    assert.equal(delivered, 1);
    assert.equal(
      await readFile(
        join(root, "receipts", `${request.requestID}.json`),
        "utf8",
      ),
      JSON.stringify(value),
    );
    assert.deepEqual(await readdir(join(root, "requests")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("opt-out before publication removes only the private temporary request", async () => {
  const root = await fixtureRoot();
  try {
    let checks = 0;
    await assert.rejects(
      publishRequest(
        root,
        randomUUID(),
        '{"url":"https://example.invalid/private"}',
        async () => {
          if (++checks === 2) throw new IntegrationError("integrationDisabled");
        },
      ),
      (error: unknown) =>
        error instanceof PublicationError && !error.mayBePublished,
    );
    assert.deepEqual(await readdir(join(root, "requests")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("opt-out after publication scrubs only its unclaimed inode", async () => {
  const root = await fixtureRoot();
  try {
    let checks = 0;
    await assert.rejects(
      publishRequest(root, randomUUID(), "{}", async () => {
        if (++checks === 3) throw new IntegrationError("integrationDisabled");
      }),
      (error: unknown) =>
        error instanceof PublicationError && !error.mayBePublished,
    );
    assert.deepEqual(await readdir(join(root, "requests")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("opt-out after an app claim retains unknown state and never erases processing", async () => {
  const root = await fixtureRoot();
  const id = randomUUID();
  try {
    let checks = 0;
    const processing = join(root, "app-processing.json");
    await assert.rejects(
      publishRequest(root, id, "{}", async () => {
        if (++checks === 3) {
          await rename(join(root, "requests", `${id}.json`), processing);
          throw new IntegrationError("integrationDisabled");
        }
      }),
      (error: unknown) =>
        error instanceof PublicationError && error.mayBePublished,
    );
    assert.equal(await readFile(processing, "utf8"), "{}");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("signature verification failure prevents publication and successful verification runs once per submission", async () => {
  const root = await fixtureRoot();
  try {
    const request = makeRequest(await loadSharedState(root), "reviewAddURL", {
      url: "https://example.invalid/file",
    });
    let checks = 0;
    await assert.rejects(
      submitVerifiedRequest(request, fixtureApp, {
        root,
        verifyApp: async () => {
          checks += 1;
          throw new IntegrationError("appSignatureInvalid");
        },
      }),
      { code: "appSignatureInvalid" },
    );
    assert.equal(checks, 1);
    assert.deepEqual(await readdir(join(root, "requests")), []);
    await submitVerifiedRequest(request, fixtureApp, {
      root,
      verifyApp: async () => {
        checks += 1;
        return fixtureApp;
      },
    });
    assert.equal(checks, 2);
    assert.equal((await readdir(join(root, "requests"))).length, 1);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("loss of access during app verification blocks publication", async () => {
  const root = await fixtureRoot();
  try {
    const shared = await loadSharedState(root);
    const request = makeRequest(shared, "reviewAddURL", {
      url: "https://example.invalid/file",
    });
    await assert.rejects(
      submitVerifiedRequest(request, fixtureApp, {
        root,
        verifyApp: async () => {
          await jsonFile(root, "state.json", {
            ...shared.snapshot,
            access: { state: "verificationRequired" },
            tasks: [],
            totalTaskCount: 0,
            capabilities: [],
          });
          return fixtureApp;
        },
      }),
      { code: "verificationRequired" },
    );
    assert.deepEqual(await readdir(join(root, "requests")), []);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("pre and post publication access checks scrub unclaimed requests without replay", async () => {
  for (const blockAt of [2, 3]) {
    const root = await fixtureRoot();
    try {
      const shared = await loadSharedState(root);
      const request = makeRequest(shared, "reviewAddURL", {
        url: "https://example.invalid/file?private=value",
      });
      let checks = 0;
      await assert.rejects(
        publishRequest(
          root,
          request.requestID,
          JSON.stringify(request),
          async () => {
            if (++checks === blockAt)
              await jsonFile(root, "state.json", {
                ...shared.snapshot,
                access: { state: "licenseRequired" },
                tasks: [],
                totalTaskCount: 0,
                capabilities: [],
              });
            await loadSharedState(root);
          },
        ),
        (error: unknown) =>
          error instanceof PublicationError &&
          error.code === "licenseRequired" &&
          !error.mayBePublished,
      );
      assert.deepEqual(await readdir(join(root, "requests")), []);
    } finally {
      await rm(root, { recursive: true });
    }
  }
});

test("existing request receipts stay readable after access or policy compatibility is lost", async () => {
  const root = await fixtureRoot();
  try {
    const shared = await loadSharedState(root);
    const request = makeRequest(shared, "reviewAddURL", {
      url: "https://example.invalid/file",
    });
    await jsonFile(
      root,
      `receipts/${request.requestID}.json`,
      receipt(request.requestID),
    );
    await jsonFile(root, "descriptor.json", {
      ...shared.descriptor,
      accessPolicyVersion: undefined,
    });
    await assert.rejects(loadSharedState(root), { code: "upgradeRequired" });
    assert.equal(
      (await readReceipt(pendingReference(request), root))?.status,
      "succeeded",
    );
    await jsonFile(root, "descriptor.json", shared.descriptor);
    await jsonFile(root, "state.json", {
      ...shared.snapshot,
      access: { state: "integrityBlocked" },
      tasks: [],
      totalTaskCount: 0,
      capabilities: [],
    });
    await assert.rejects(loadSharedState(root), { code: "integrityBlocked" });
    assert.equal(
      (await readReceipt(pendingReference(request), root))?.status,
      "succeeded",
    );
  } finally {
    await rm(root, { recursive: true });
  }
});
