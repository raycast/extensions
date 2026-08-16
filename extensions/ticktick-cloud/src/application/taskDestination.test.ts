import { describe, expect, it, vi } from "vitest";

import { ProtocolError } from "../domain/errors";
import type { Project } from "../domain/project";
import {
  loadTaskDestinationContext,
  rememberCreatedTaskDestination,
  requireTaskDestination,
  type TaskDestinationDependencies,
  type TaskDestinationPreferencePort,
  type TaskDestinationScope,
} from "./taskDestination";

const NO_DESTINATION_MESSAGE = "TickTick did not expose an available task destination.";
const INVALID_CREATED_DESTINATION_MESSAGE = "TickTick returned an invalid created-task destination.";

const scope: TaskDestinationScope = Object.freeze({ backendId: "mcp", accountKey: "account-key" });

const inboxProject: Project = Object.freeze({
  id: "project-inbox",
  name: "Inbox",
  kind: "inbox",
  closed: false,
});

const workProject: Project = Object.freeze({
  id: "project-work",
  name: "Work",
  kind: "project",
  closed: false,
});

const closedProject: Project = Object.freeze({
  id: "project-closed",
  name: "Closed",
  kind: "project",
  closed: true,
});

function preferencePort(...values: [unknown?]): TaskDestinationPreferencePort {
  const storedValue = values.length === 0 ? workProject.id : values[0];
  return {
    load: vi.fn(async () => storedValue as string | undefined),
    remember: vi.fn(async () => undefined),
  };
}

function dependencies(
  overrides: Partial<{
    scope: TaskDestinationScope;
    projects: readonly Project[];
    listProjects(): Promise<readonly Project[]>;
    preferences: TaskDestinationPreferencePort;
  }> = {}
): TaskDestinationDependencies {
  const projects = overrides.projects ?? [inboxProject, workProject, closedProject];
  return {
    scope: overrides.scope ?? scope,
    listProjects: overrides.listProjects ?? vi.fn(async () => projects),
    preferences: overrides.preferences ?? preferencePort(),
  };
}

async function captureFailure(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the operation to fail");
}

describe("loadTaskDestinationContext", () => {
  it("uses a remembered real open project and reads each source once", async () => {
    const listProjects = vi.fn(async () => [inboxProject, workProject, closedProject]);
    const preferences = preferencePort(workProject.id);
    const context = await loadTaskDestinationContext(dependencies({ listProjects, preferences }));

    expect(context.destination).toEqual(workProject);
    expect(context.projects).toEqual([inboxProject, workProject]);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(preferences.load).toHaveBeenCalledOnce();
    expect(preferences.load).toHaveBeenCalledWith(scope);
  });

  it.each([
    ["missing", undefined],
    ["unknown", "missing-project"],
    ["closed", closedProject.id],
    ["blank", " \n\t "],
    ["control", "project\u0000id"],
    ["format", "project\u202eid"],
    ["unpaired high surrogate", "project\ud800id"],
    ["unpaired low surrogate", "project\udc00id"],
    ["number", 42],
    ["object", { id: workProject.id }],
  ])("falls back to the real Inbox for a %s remembered value", async (_case, remembered) => {
    const context = await loadTaskDestinationContext(
      dependencies({ preferences: preferencePort(remembered), projects: [workProject, closedProject, inboxProject] })
    );

    expect(context.destination).toEqual(inboxProject);
  });

  it("falls back to Inbox when reading the preference fails", async () => {
    const failure = new Error("private preference failure");
    const preferences = preferencePort();
    vi.mocked(preferences.load).mockRejectedValue(failure);

    await expect(loadTaskDestinationContext(dependencies({ preferences }))).resolves.toMatchObject({
      destination: inboxProject,
    });
    expect(preferences.load).toHaveBeenCalledOnce();
  });

  it("never treats a project named Inbox or the first arbitrary project as the Inbox", async () => {
    const namedInbox: Project = { id: "named-inbox", name: "Inbox", kind: "project", closed: false };
    const other: Project = { id: "first-project", name: "First", kind: "project", closed: false };

    const context = await loadTaskDestinationContext(
      dependencies({ projects: [other, namedInbox], preferences: preferencePort(undefined) })
    );

    expect(context.destination).toBeUndefined();
    expect(context.projects).toEqual([other, namedInbox]);
  });

  it("does not use a closed Inbox", async () => {
    const closedInbox: Project = { ...inboxProject, closed: true };

    const context = await loadTaskDestinationContext(
      dependencies({ projects: [workProject, closedInbox], preferences: preferencePort(undefined) })
    );

    expect(context.destination).toBeUndefined();
    expect(context.projects).toEqual([workProject]);
  });

  it("filters malformed and hostile project records without evaluating them twice", async () => {
    const reads = { id: 0, name: 0, kind: 0, closed: 0 };
    const oneReadProject = {
      get id() {
        reads.id += 1;
        return inboxProject.id;
      },
      get name() {
        reads.name += 1;
        return inboxProject.name;
      },
      get kind() {
        reads.kind += 1;
        return inboxProject.kind;
      },
      get closed() {
        reads.closed += 1;
        return inboxProject.closed;
      },
    } as Project;
    const throwing = Object.defineProperty({}, "id", {
      get() {
        throw new Error("private project getter");
      },
    });
    const malformed = [
      undefined,
      null,
      42,
      throwing,
      { ...workProject, id: " " },
      { ...workProject, id: "project\u001fid" },
      { ...workProject, name: " " },
      { ...workProject, kind: "smart" },
      { ...workProject, closed: "false" },
      oneReadProject,
    ] as unknown as Project[];

    const context = await loadTaskDestinationContext(
      dependencies({ projects: malformed, preferences: preferencePort(undefined) })
    );

    expect(context.projects).toEqual([inboxProject]);
    expect(context.destination).toEqual(inboxProject);
    expect(reads).toEqual({ id: 1, name: 1, kind: 1, closed: 1 });
  });

  it("filters a revoked project proxy without discarding the otherwise-valid catalog", async () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    const context = await loadTaskDestinationContext(
      dependencies({
        projects: [workProject, revoked.proxy as Project, inboxProject],
        preferences: preferencePort(undefined),
      })
    );

    expect(context.projects).toEqual([workProject, inboxProject]);
    expect(context.destination).toEqual(inboxProject);
  });

  it("returns detached deeply frozen project data without mutating the catalog", async () => {
    const mutableInbox: Project = { ...inboxProject };
    const mutableWork: Project = { ...workProject };
    const catalog = [mutableInbox, mutableWork, { ...closedProject }];
    const before = structuredClone(catalog);

    const context = await loadTaskDestinationContext(
      dependencies({ projects: catalog, preferences: preferencePort(workProject.id) })
    );

    expect(catalog).toEqual(before);
    expect(context).not.toBe(catalog);
    expect(context.projects[0]).not.toBe(mutableInbox);
    expect(context.destination).not.toBe(mutableWork);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.projects)).toBe(true);
    expect(context.projects.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(context.destination)).toBe(true);

    mutableWork.name = "Changed later";
    catalog.reverse();
    expect(context.destination?.name).toBe("Work");
    expect(context.projects.map((project) => project.id)).toEqual([inboxProject.id, workProject.id]);
  });

  it("propagates a project-catalog failure unchanged and does not read preferences", async () => {
    const failure = new Error("catalog unavailable");
    const preferences = preferencePort();
    const listProjects = vi.fn().mockRejectedValue(failure);

    await expect(loadTaskDestinationContext(dependencies({ listProjects, preferences }))).rejects.toBe(failure);
    expect(listProjects).toHaveBeenCalledOnce();
    expect(preferences.load).not.toHaveBeenCalled();
  });

  it.each([undefined, null, {}, "projects"])(
    "rejects a malformed project catalog with a fixed protocol error (%j)",
    async (catalog) => {
      const failure = await captureFailure(() =>
        loadTaskDestinationContext(
          dependencies({ listProjects: vi.fn(async () => catalog as unknown as readonly Project[]) })
        )
      );

      expect(failure).toBeInstanceOf(ProtocolError);
      expect(failure).toMatchObject({ message: NO_DESTINATION_MESSAGE, code: "protocol", retryable: false });
    }
  );

  it("converts a revoked project-catalog proxy into the fixed protocol error", async () => {
    const revoked = Proxy.revocable([], {
      get(target, property, receiver) {
        if (property === "then") {
          revoked.revoke();
          return undefined;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const failure = await captureFailure(() =>
      loadTaskDestinationContext(
        dependencies({
          listProjects: vi.fn(async () => revoked.proxy as unknown as readonly Project[]),
        })
      )
    );

    expect(failure).toBeInstanceOf(ProtocolError);
    expect(failure).toMatchObject({ message: NO_DESTINATION_MESSAGE, code: "protocol", retryable: false });
  });
});

describe("requireTaskDestination", () => {
  it("returns the same frozen preferred-or-Inbox policy result", async () => {
    const result = await requireTaskDestination(dependencies({ preferences: preferencePort(workProject.id) }));

    expect(result).toEqual(workProject);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("throws a fixed safe protocol error when no valid preferred project or Inbox exists", async () => {
    const privateMarker = "private-project-marker";
    const failure = await captureFailure(() =>
      requireTaskDestination(
        dependencies({
          projects: [{ id: privateMarker, name: "Not Inbox", kind: "project", closed: false }],
          preferences: preferencePort("missing-private-preference"),
        })
      )
    );

    expect(failure).toBeInstanceOf(ProtocolError);
    expect(failure).toMatchObject({ message: NO_DESTINATION_MESSAGE, code: "protocol", retryable: false });
    expect(JSON.stringify(failure)).not.toContain(privateMarker);
    expect((failure as Error).message).not.toContain("missing-private-preference");
  });
});

describe("rememberCreatedTaskDestination", () => {
  it("writes only the confirmed project ID once without reading other task fields", async () => {
    const preferences = preferencePort(undefined);
    let projectIdReads = 0;
    const task = {
      get projectId() {
        projectIdReads += 1;
        return workProject.id;
      },
      get title() {
        throw new Error("the private task title must not be read");
      },
    };

    await rememberCreatedTaskDestination(preferences, scope, task);

    expect(projectIdReads).toBe(1);
    expect(preferences.remember).toHaveBeenCalledOnce();
    expect(preferences.remember).toHaveBeenCalledWith(scope, workProject.id);
    expect(JSON.stringify(vi.mocked(preferences.remember).mock.calls)).not.toContain("private task title");
  });

  it.each([
    ["missing", undefined],
    ["blank", " \n "],
    ["control", "project\u007fid"],
    ["format", "project\u2066id"],
    ["unpaired high surrogate", "project\ud800id"],
    ["unpaired low surrogate", "project\udc00id"],
    ["number", 7],
  ])("rejects a %s confirmed project ID without writing", async (_case, projectId) => {
    const preferences = preferencePort(undefined);
    const failure = await captureFailure(() =>
      rememberCreatedTaskDestination(preferences, scope, { projectId } as { projectId: string })
    );

    expect(failure).toBeInstanceOf(ProtocolError);
    expect(failure).toMatchObject({ message: INVALID_CREATED_DESTINATION_MESSAGE });
    expect(preferences.remember).not.toHaveBeenCalled();
  });

  it("converts a hostile task getter into the fixed protocol error", async () => {
    const preferences = preferencePort(undefined);
    const privateMarker = "private getter failure";
    const task = Object.defineProperty({}, "projectId", {
      get() {
        throw new Error(privateMarker);
      },
    }) as { projectId: string };

    const failure = await captureFailure(() => rememberCreatedTaskDestination(preferences, scope, task));

    expect(failure).toBeInstanceOf(ProtocolError);
    expect(failure).toMatchObject({ message: INVALID_CREATED_DESTINATION_MESSAGE });
    expect((failure as Error).message).not.toContain(privateMarker);
    expect(preferences.remember).not.toHaveBeenCalled();
  });

  it("propagates a preference write failure unchanged without retrying", async () => {
    const failure = new Error("write failed");
    const preferences = preferencePort(undefined);
    vi.mocked(preferences.remember).mockRejectedValue(failure);

    await expect(rememberCreatedTaskDestination(preferences, scope, { projectId: workProject.id })).rejects.toBe(
      failure
    );
    expect(preferences.remember).toHaveBeenCalledOnce();
  });
});
