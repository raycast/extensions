import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const DIA_BUNDLE_ID = "company.thebrowser.dia";

export type DiaTab = {
  id: string;
  profile: string;
  url: string;
  windowId: string;
};

type DiaCommandResult = {
  data: Record<string, unknown>;
  success: true;
};

export async function openDiaTab(url: string, requestedProfile?: string, applicationPath?: string): Promise<DiaTab> {
  if (process.platform !== "darwin") throw new Error("Dia spaces are currently available only on macOS.");

  const openTarget = applicationPath ? ["-a", applicationPath] : ["-b", DIA_BUNDLE_ID];
  await execFileAsync("/usr/bin/open", [...openTarget, "--args", "--enable-applescript-javascript"], {
    timeout: 10_000,
  });
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", OPEN_TAB_SCRIPT, "--", requestedProfile ?? "", url, applicationPath ?? "Dia"],
    { encoding: "utf8", timeout: 10_000 },
  );

  try {
    return JSON.parse(stdout.trim()) as DiaTab;
  } catch {
    throw new Error("Dia created a tab but did not return its details.");
  }
}

export async function runDiaCommand(
  commandArguments: string[],
  tabId: string | undefined,
  applicationPath?: string,
): Promise<DiaCommandResult> {
  if (!tabId) throw new Error("This Dia session has no active tab. Open a page in the session first.");

  const command = commandArguments[0];
  if (command === "wait" && /^\d+$/.test(commandArguments[1] ?? "")) {
    const milliseconds = Number(commandArguments[1]);
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
    return { success: true, data: { waitedMs: milliseconds } };
  }

  const javascript = buildDiaJavascript(commandArguments);
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", EXECUTE_SCRIPT, "--", applicationPath ?? "Dia", tabId, javascript],
    { encoding: "utf8", maxBuffer: 1_000_000, timeout: 30_000 },
  ).catch((error: unknown) => {
    const message = executionErrorMessage(error);
    if (message.includes("--enable-applescript-javascript")) {
      throw new Error(
        "Dia page interaction requires a one-time restart. Quit Dia, then open the session again so Agent Browser can launch it with JavaScript automation enabled.",
      );
    }
    throw error;
  });

  try {
    const response = JSON.parse(stdout.trim()) as { result?: unknown };
    const data = decodeDiaResult(response.result);
    if (!isRecord(data)) throw new Error();
    return { success: true, data };
  } catch {
    throw new Error("Dia executed the page command but returned an invalid result.");
  }
}

export async function closeDiaTabs(tabIds: string[], applicationPath?: string): Promise<number> {
  if (process.platform !== "darwin" || tabIds.length === 0) return 0;
  const { stdout } = await execFileAsync(
    "/usr/bin/osascript",
    ["-l", "JavaScript", "-e", CLOSE_TABS_SCRIPT, "--", applicationPath ?? "Dia", ...tabIds],
    { encoding: "utf8", timeout: 10_000 },
  );
  return Number.parseInt(stdout.trim(), 10) || 0;
}

const OPEN_TAB_SCRIPT = String.raw`
function run(argv) {
  const requestedProfile = argv[0];
  const url = argv[1];
  const dia = Application(argv[2]);
  dia.activate();

  let windows = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    windows = dia.windows();
    if (windows.length > 0) break;
    delay(0.1);
  }
  if (windows.length === 0) throw new Error("Dia has no browser window available.");

  let targetWindow = windows[0];
  let targetProfile;
  if (requestedProfile) {
    const expected = requestedProfile.toLocaleLowerCase();
    for (const window of windows) {
      const match = window.profiles().find((profile) => profile.name().toLocaleLowerCase() === expected);
      if (match) {
        targetWindow = window;
        targetProfile = match;
        break;
      }
    }
    if (!targetProfile) {
      const names = windows[0].profiles().map((profile) => profile.name()).join(", ");
      throw new Error('Dia profile "' + requestedProfile + '" was not found. Available profiles: ' + names + ".");
    }
  } else {
    targetProfile = targetWindow.activeProfile();
  }

  targetProfile.focus();
  const tab = dia.Tab({ url });
  targetProfile.tabs.push(tab);
  tab.focus();
  return JSON.stringify({
    id: String(tab.id()),
    profile: targetProfile.name(),
    url,
    windowId: String(targetWindow.id()),
  });
}
`;

const CLOSE_TABS_SCRIPT = String.raw`
function run(argv) {
  const dia = Application(argv[0]);
  const wanted = new Set(argv.slice(1));
  let closed = 0;
  for (const window of dia.windows()) {
    for (const profile of window.profiles()) {
      for (const tab of profile.tabs()) {
        if (wanted.has(String(tab.id()))) {
          tab.close();
          closed++;
        }
      }
    }
  }
  return String(closed);
}
`;

const EXECUTE_SCRIPT = String.raw`
function run(argv) {
  const dia = Application(argv[0]);
  const wantedId = argv[1];
  const javascript = argv[2];
  for (const window of dia.windows()) {
    for (const profile of window.profiles()) {
      const tab = profile.tabs().find((candidate) => String(candidate.id()) === wantedId);
      if (!tab) continue;
      return JSON.stringify({ result: tab.execute({ javascript: javascript }) });
    }
  }
  throw new Error("The Dia tab for this session is no longer open.");
}
`;

function buildDiaJavascript(args: string[]): string {
  const command = args[0];
  if (command === "snapshot") return diaSnapshotJavascript(args.includes("-i"));
  if (command === "read") return resultJavascript("text", "document.body.innerText.slice(0, 30000)");
  if (command === "get") return diaGetJavascript(args);
  if (command === "is") return diaIsJavascript(args);
  if (command === "click" || command === "dblclick") {
    const ref = requireDiaRef(args[1]);
    const count = command === "dblclick" ? 2 : 1;
    return elementJavascript(
      ref,
      `element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: ${count}, view: window }));`,
      {
        message: `${command === "dblclick" ? "Double-clicked" : "Clicked"} ${ref}`,
      },
    );
  }
  if (["fill", "type", "select"].includes(command)) {
    const ref = requireDiaRef(args[1]);
    const value = JSON.stringify(args[2] ?? "");
    const assignment =
      command === "type" ? `element.value = String(element.value || "") + ${value};` : `element.value = ${value};`;
    return elementJavascript(
      ref,
      `${assignment} element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true }));`,
      { message: `${command === "select" ? "Selected" : "Entered text in"} ${ref}` },
    );
  }
  if (["focus", "hover", "check", "uncheck", "scrollintoview"].includes(command)) {
    const ref = requireDiaRef(args[1]);
    const action =
      command === "hover"
        ? 'element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, view: window }));'
        : command === "check" || command === "uncheck"
          ? `element.checked = ${command === "check"}; element.dispatchEvent(new Event("change", { bubbles: true }));`
          : command === "scrollintoview"
            ? 'element.scrollIntoView({ block: "center", inline: "center" });'
            : "element.focus();";
    return elementJavascript(ref, action, { message: `${command} ${ref}` });
  }
  if (command === "scroll") {
    const direction = args[1] ?? "down";
    const pixels = Number(args[2] ?? 500);
    const x = direction === "left" ? -pixels : direction === "right" ? pixels : 0;
    const y = direction === "up" ? -pixels : direction === "down" ? pixels : 0;
    return resultJavascript("message", `window.scrollBy(${x}, ${y}); "Scrolled ${direction}"`);
  }
  if (command === "back" || command === "forward" || command === "reload") {
    const expression =
      command === "back" ? "history.back()" : command === "forward" ? "history.forward()" : "location.reload()";
    return resultJavascript("message", `${expression}; ${JSON.stringify(command)}`);
  }
  throw new Error(`Dia does not support the ${args.join(" ")} operation yet.`);
}

function diaSnapshotJavascript(interactiveOnly: boolean): string {
  return String.raw`(() => {
    document.querySelectorAll("[data-raycast-agent-ref]").forEach((element) => element.removeAttribute("data-raycast-agent-ref"));
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const selector = ${JSON.stringify(interactiveOnly ? 'a,button,input,textarea,select,[role="button"],[role="link"],[tabindex]' : "body *")};
    const elements = Array.from(document.querySelectorAll(selector)).filter(visible).slice(0, 500);
    const lines = elements.map((element, index) => {
      const ref = "e" + (index + 1);
      element.setAttribute("data-raycast-agent-ref", ref);
      const role = element.getAttribute("role") || ({ A: "link", BUTTON: "button", INPUT: element.type || "textbox", TEXTAREA: "textbox", SELECT: "combobox" }[element.tagName] || element.tagName.toLowerCase());
      const label = (element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.value || element.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 200);
      const state = element.disabled ? " [disabled]" : element.checked ? " [checked]" : "";
      return "- " + role + " " + JSON.stringify(label) + " [ref=" + ref + "]" + state;
    });
    return JSON.stringify({ snapshot: lines.join("\n"), title: document.title, url: location.href });
  })()`;
}

function diaGetJavascript(args: string[]): string {
  const operation = args[1];
  if (operation === "title") return resultJavascript("title", "document.title");
  if (operation === "url") return resultJavascript("url", "location.href");
  const ref = requireDiaRef(args[2]);
  if (operation === "text")
    return elementValueJavascript(ref, "text", 'element.innerText || element.getAttribute("aria-label") || ""');
  if (operation === "html") return elementValueJavascript(ref, "html", "element.innerHTML");
  if (operation === "value") return elementValueJavascript(ref, "value", 'element.value || ""');
  if (operation === "attr") {
    const attribute = JSON.stringify(args[3] ?? "");
    return elementValueJavascript(ref, "value", `element.getAttribute(${attribute})`);
  }
  throw new Error(`Dia does not support get ${operation} yet.`);
}

function diaIsJavascript(args: string[]): string {
  const operation = args[1];
  const ref = requireDiaRef(args[2]);
  const expression =
    operation === "visible"
      ? 'getComputedStyle(element).visibility !== "hidden" && getComputedStyle(element).display !== "none" && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0'
      : operation === "enabled"
        ? "!element.disabled"
        : operation === "checked"
          ? "Boolean(element.checked)"
          : undefined;
  if (!expression) throw new Error(`Dia does not support is ${operation} yet.`);
  return elementValueJavascript(ref, operation, expression);
}

function elementJavascript(ref: string, action: string, result: Record<string, unknown>): string {
  return String.raw`(() => { const element = document.querySelector(${JSON.stringify(`[data-raycast-agent-ref="${ref}"]`)}); if (!element) throw new Error(${JSON.stringify(`Element ${ref} is no longer available. Take a fresh snapshot.`)}); ${action} return JSON.stringify(${JSON.stringify(result)}); })()`;
}

function elementValueJavascript(ref: string, key: string, expression: string): string {
  return String.raw`(() => { const element = document.querySelector(${JSON.stringify(`[data-raycast-agent-ref="${ref}"]`)}); if (!element) throw new Error(${JSON.stringify(`Element ${ref} is no longer available. Take a fresh snapshot.`)}); return JSON.stringify({ ${JSON.stringify(key)}: ${expression} }); })()`;
}

function resultJavascript(key: string, expression: string): string {
  return String.raw`(() => JSON.stringify({ ${JSON.stringify(key)}: ${expression} }))()`;
}

function requireDiaRef(value: string | undefined): string {
  const ref = value?.startsWith("@") ? value.slice(1) : value;
  if (!ref || !/^e\d+$/.test(ref)) throw new Error("Dia interactions require a fresh element ref such as @e2.");
  return ref;
}

function executionErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const details = error as Error & { stderr?: string; stdout?: string };
  return details.stderr?.trim() || details.stdout?.trim() || details.message;
}

function decodeDiaResult(value: unknown): unknown {
  let decoded = value;
  for (let attempt = 0; attempt < 3 && typeof decoded === "string"; attempt++) {
    decoded = JSON.parse(decoded);
  }
  return decoded;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
