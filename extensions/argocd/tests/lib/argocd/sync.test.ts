import { describe, expect, it } from "vitest";
import {
  DEFAULT_SYNC_FORM,
  buildSyncRequest,
  describeSyncRequest,
  type SyncFormValues,
} from "../../../src/lib/argocd/sync";
import { ValidationError } from "../../../src/lib/config/instances";

function form(overrides: Partial<SyncFormValues> = {}): SyncFormValues {
  return { ...DEFAULT_SYNC_FORM, ...overrides };
}

describe("buildSyncRequest", () => {
  it("sends nothing at all for an untouched form", () => {
    const request = buildSyncRequest(DEFAULT_SYNC_FORM);
    expect(request).toEqual({});
    expect(Object.keys(request)).toHaveLength(0);
  });

  it("sets an explicit revision and trims it", () => {
    expect(buildSyncRequest(form({ revision: "  v1.4.0 " })).revision).toBe("v1.4.0");
  });

  it("ignores a whitespace-only revision", () => {
    expect(buildSyncRequest(form({ revision: "   " }))).toEqual({});
  });

  it("sets prune and dryRun only when asked", () => {
    expect(buildSyncRequest(form({ prune: true, dryRun: true })).prune).toBe(true);
    expect(buildSyncRequest(form({ prune: true, dryRun: true })).dryRun).toBe(true);
    expect(buildSyncRequest(form()).prune).toBeUndefined();
    expect(buildSyncRequest(form()).dryRun).toBeUndefined();
  });

  it("selects the apply strategy for apply-only, leaving the hook strategy unset", () => {
    const request = buildSyncRequest(form({ applyOnly: true }));
    expect(request.strategy).toEqual({ apply: {} });
    expect(request.strategy?.hook).toBeUndefined();
  });

  it("forces through the apply strategy when apply-only is on", () => {
    expect(buildSyncRequest(form({ applyOnly: true, force: true })).strategy).toEqual({
      apply: { force: true },
    });
  });

  it("forces through the hook strategy when apply-only is off", () => {
    expect(buildSyncRequest(form({ force: true })).strategy).toEqual({ hook: { force: true } });
  });

  it("appends the sync options in a stable order", () => {
    const request = buildSyncRequest(
      form({ replace: true, serverSideApply: true, pruneLast: true, skipSchemaValidation: true }),
    );
    expect(request.syncOptions?.items).toEqual([
      "Replace=true",
      "ServerSideApply=true",
      "PruneLast=true",
      "Validate=false",
    ]);
  });

  it("appends only the selected sync options", () => {
    expect(buildSyncRequest(form({ pruneLast: true })).syncOptions?.items).toEqual(["PruneLast=true"]);
  });

  it("omits syncOptions entirely when none is selected", () => {
    expect(buildSyncRequest(form()).syncOptions).toBeUndefined();
  });

  it("builds the retry strategy with ArgoCD's own backoff defaults", () => {
    expect(buildSyncRequest(form({ retry: true, retryLimit: "3" })).retryStrategy).toEqual({
      limit: 3,
      backoff: { duration: "5s", factor: 2, maxDuration: "3m" },
    });
  });

  it("accepts a retry limit of zero", () => {
    expect(buildSyncRequest(form({ retry: true, retryLimit: "0" })).retryStrategy?.limit).toBe(0);
  });

  it("rejects a retry limit that is not a whole positive number", () => {
    for (const retryLimit of ["abc", "-1", "1.5", ""]) {
      expect(() => buildSyncRequest(form({ retry: true, retryLimit }))).toThrowError(ValidationError);
    }
    try {
      buildSyncRequest(form({ retry: true, retryLimit: "abc" }));
    } catch (error) {
      expect((error as ValidationError).field).toBe("retryLimit");
    }
  });

  it("omits the retry strategy when retry is off, whatever the limit says", () => {
    expect(buildSyncRequest(form({ retryLimit: "9" })).retryStrategy).toBeUndefined();
  });
});

describe("describeSyncRequest", () => {
  it("says the defaults apply when nothing was selected", () => {
    expect(describeSyncRequest({})).toBe("Syncs with the application's default options.");
  });

  it("names a dry run that prunes", () => {
    const description = describeSyncRequest(buildSyncRequest(form({ dryRun: true, prune: true })));
    expect(description).toContain("dry run");
    expect(description).toContain("prunes removed resources");
  });

  it("names the revision, the strategy and the retries", () => {
    const description = describeSyncRequest(
      buildSyncRequest(form({ revision: "v1", applyOnly: true, force: true, retry: true, retryLimit: "4" })),
    );
    expect(description).toContain("revision v1");
    expect(description).toContain("apply only, hooks skipped");
    expect(description).toContain("forced");
    expect(description).toContain("retries up to 4 times");
  });

  it("names each sync option verbatim, so the operator reads what is sent", () => {
    const description = describeSyncRequest(buildSyncRequest(form({ replace: true })));
    expect(description).toContain("Replace=true");
  });
});
