export type SessionContext = {
  backend?: "agent-browser" | "dia" | "safari";
  applicationName?: string;
  fakeHome?: string;
  socketDirectory?: string;
  profile?: string;
};

export type Session = {
  id: string;
  name: string;
  label: string;
  source: string;
  context?: SessionContext;
  managed: boolean;
};

export type SessionRunner = (
  args: string[],
  context: SessionContext | undefined,
  signal: AbortSignal,
) => Promise<unknown>;

function environmentKey(context?: SessionContext): string {
  return JSON.stringify([context?.socketDirectory ?? "", context?.fakeHome ?? ""]);
}

export function describeSessionSource(context?: SessionContext): string {
  const parts: string[] = [];
  if (context?.socketDirectory) parts.push(`Socket directory: ${context.socketDirectory}`);
  if (context?.fakeHome) parts.push(`Profile bridge: ${context.fakeHome}`);
  return parts.join(" · ") || "Inherited CLI environment";
}

export function describeSessionTarget(session: Session): string {
  return `${session.name}\n${session.source}`;
}

export function parseSessionList(result: unknown): string[] {
  const response = result as { success?: unknown; data?: { sessions?: unknown } } | null;
  const names = response?.data?.sessions;
  if (response?.success !== true || !Array.isArray(names) || names.some((name) => typeof name !== "string")) {
    throw new Error("Unsupported session list response. Update agent-browser and refresh.");
  }
  // Names outside the extension's supported syntax cannot safely be targeted.
  if (names.some((name: string) => !/^[a-zA-Z0-9._-]{1,64}$/.test(name))) {
    throw new Error("The CLI returned unsupported session names. Manage those sessions with the CLI.");
  }
  return [...new Set(names)].sort();
}

export async function listSessions(
  contexts: Record<string, SessionContext>,
  run: SessionRunner,
  signal: AbortSignal,
  retainedEnvironments: SessionContext[] = [],
): Promise<{ sessions: Session[]; failedSources: number }> {
  const sources = new Map<string, SessionContext | undefined>([[environmentKey(), undefined]]);
  for (const context of [...Object.values(contexts), ...retainedEnvironments]) {
    if (context.backend === "dia" || context.backend === "safari") continue;
    if (context.socketDirectory || context.fakeHome) sources.set(environmentKey(context), context);
  }
  const results = await Promise.allSettled(
    [...sources].map(async ([key, context]) => {
      const names = parseSessionList(await run(["session", "list"], context, signal));
      return names.map((name): Session => {
        const stored = Object.hasOwn(contexts, name) ? contexts[name] : undefined;
        const managed =
          !!stored && stored.backend !== "dia" && stored.backend !== "safari" && environmentKey(stored) === key;
        const source = describeSessionSource(context);
        return {
          id: JSON.stringify([key, name]),
          name,
          label: `${managed ? `Raycast · ${stored.applicationName || "Agent Browser"}` : "CLI"} · ${source}`,
          source,
          context,
          managed,
        };
      });
    }),
  );
  signal.throwIfAborted();
  if (results.every((result) => result.status === "rejected")) {
    const failure = results.find((result) => result.status === "rejected");
    throw failure?.reason;
  }
  return {
    sessions: results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
    failedSources: results.filter((result) => result.status === "rejected").length,
  };
}

export function normalizeSessionUrl(value: string): string {
  const input = value.trim();
  if (!input) throw new Error("Enter a URL.");
  if (input.startsWith("-")) throw new Error("Enter an HTTP or HTTPS URL.");
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`);
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error("Use an HTTP or HTTPS URL without embedded credentials.");
  }
  return url.href;
}

/** Recheck immediately before mutations: the CLI can otherwise auto-start a stale session. */
export async function actOnSession(
  session: Session,
  action: { type: "close" } | { type: "open"; url: string },
  run: SessionRunner,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(session.name)) throw new Error("Unsupported session name. Refresh the list.");
  const url = action.type === "open" ? normalizeSessionUrl(action.url) : undefined;
  const names = parseSessionList(await run(["session", "list"], session.context, signal));
  signal.throwIfAborted();
  if (!names.includes(session.name))
    throw new Error("This session is no longer active. Refresh and choose an active session.");
  const result = await run(["--session", session.name, ...(url ? ["open", url] : ["close"])], session.context, signal);
  signal.throwIfAborted();
  if (!result || typeof result !== "object" || !("success" in result) || result.success !== true) {
    throw new Error("The session operation did not succeed. Refresh before retrying.");
  }
}

export async function closeSessionWithConfirmation(
  session: Session,
  confirm: (target: string) => Promise<boolean>,
  run: SessionRunner,
  signal: AbortSignal,
): Promise<boolean> {
  signal.throwIfAborted();
  if (!(await confirm(describeSessionTarget(session)))) return false;
  signal.throwIfAborted();
  await actOnSession(session, { type: "close" }, run, signal);
  return true;
}

export async function cleanupClosedSession(
  session: Session,
  contexts: Record<string, SessionContext>,
  run: SessionRunner,
  clear: (name: string, options: { preserveFiles: boolean }) => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  const current = Object.hasOwn(contexts, session.name) ? contexts[session.name] : undefined;
  if (!session.managed || !current || current.backend === "dia" || current.backend === "safari") return;
  if (environmentKey(current) !== environmentKey(session.context)) return;
  let preserveFiles = false;
  if (current.fakeHome) {
    preserveFiles = Object.entries(contexts).some(
      ([name, context]) =>
        name !== session.name &&
        (context.fakeHome === current.fakeHome ||
          (!!current.socketDirectory && context.socketDirectory === current.socketDirectory)),
    );
    if (!preserveFiles) {
      try {
        preserveFiles = parseSessionList(await run(["session", "list"], current, signal)).length > 0;
      } catch {
        // Closure already succeeded. Forget its binding but keep files when liveness is unknown.
        signal.throwIfAborted();
        preserveFiles = true;
      }
    }
  }
  signal.throwIfAborted();
  await clear(session.name, { preserveFiles });
}
