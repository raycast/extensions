import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { Application, BrowserExtension, captureException, getDefaultApplication, open, showHUD } from "@raycast/api";
import { BrowserSetup, BrowserTab, Tab } from "../types/types";
import { TEST_URL } from "./constants";
import { recentOnTop } from "../types/preferences";

// Windows implementation.
//
// Listing: the Raycast Browser Extension provides all tabs with exact URLs and favicons.
// It does not report which browser a tab belongs to, so tabs are grouped under the
// default browser, and there is no per-browser setup screen. Raycast routes Browser
// Extension requests to one browser at a time, so with the extension installed in several
// browsers the list reflects the browser used most recently.
//
// Jumping and closing: the Browser Extension API cannot focus or close tabs, so these
// actions drive the browser's tab strip through Windows UI Automation, matching the tab
// by title (first match wins if several tabs share a title). PowerShell and the UI
// Automation assemblies take over a second to start, so a single PowerShell process is
// spawned when the command launches and reused; it exits together with the extension when
// its stdin closes.

// Chromium-based browser process names (Firefox-based browsers are unsupported, same as on macOS)
const BROWSER_PROCESSES = "'chrome','msedge','brave','vivaldi','opera','opera_gx','arc','dia','chromium'";

const OK_MARKER = "<<OK>>";
const ERR_MARKER = "<<ERR>>";
const RUN_TIMEOUT = 10000;

// Notes on the PowerShell below:
// - The tab strip is the first Tab control that is not inside a Document element and has
//   TabItem children: ARIA tablists in the page content are also Tab controls, and Edge
//   wraps its strip in an outer Tab control that has no direct items.
// - Tab names carry state suffixes the page title lacks (" - Audio playing", " - Left
//   view", " - Memory usage - 421 MB"), stripped before comparing.
// - Find-BrowserTab's argument must be parenthesized at the call site: in argument
//   position PowerShell treats a method call as a literal string.
const psPrelude = `
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type -Namespace Win32 -Name Native -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);'
$tabStripCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Tab)
$tabItemCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)
$btnCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
$classCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Chrome_WidgetWin_1')
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$titleSuffix = [regex] '( - (Left view|Right view|Audio playing|Audio muted|(High )?[Mm]emory usage - \\d+(\\.\\d+)? [A-Z]B))+$'
function Get-TabItems($window) {
  foreach ($strip in $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabStripCond)) {
    $inDocument = $false
    $cur = $walker.GetParent($strip)
    while ($cur -ne $null -and -not [System.Windows.Automation.Automation]::Compare($cur, $window)) {
      if ($cur.Current.ControlType -eq [System.Windows.Automation.ControlType]::Document) { $inDocument = $true; break }
      $cur = $walker.GetParent($cur)
    }
    if ($inDocument) { continue }
    $items = $strip.FindAll([System.Windows.Automation.TreeScope]::Children, $tabItemCond)
    if ($items.Count -gt 0) { return $items }
  }
  return $null
}

function Find-BrowserTab($title) {
  $procs = @{}
  Get-Process -Name ${BROWSER_PROCESSES} -ErrorAction SilentlyContinue | ForEach-Object { $procs[$_.Id] = $true }
  foreach ($window in [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $classCond)) {
    try {
      if (-not $procs[$window.Current.ProcessId]) { continue }
      $tabs = Get-TabItems $window
      if (-not $tabs) { continue }
      foreach ($tab in $tabs) {
        if ($titleSuffix.Replace($tab.Current.Name, '') -eq $title) {
          $script:wnd = $window
          $script:tab = $tab
          return
        }
      }
    } catch {
      continue
    }
  }
  throw "Tab not found"
}

`;

const psTitle = (title: string) =>
  `([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(title, "utf8").toString("base64")}')))`;

const scriptJumpToTab = (title: string) => `
Find-BrowserTab ${psTitle(title)}
$script:tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
$wp = $script:wnd.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
if ($wp.Current.WindowVisualState -eq [System.Windows.Automation.WindowVisualState]::Minimized) {
  $wp.SetWindowVisualState([System.Windows.Automation.WindowVisualState]::Normal)
}
[Win32.Native]::SetForegroundWindow([IntPtr]$script:wnd.Current.NativeWindowHandle) | Out-Null
`;

// the close button is only rendered on the selected or hovered tab, so select the tab first
const scriptCloseTab = (title: string) => `
Find-BrowserTab ${psTitle(title)}
$script:tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
$btn = $script:tab.FindFirst([System.Windows.Automation.TreeScope]::Children, $btnCond)
if (-not $btn) { throw "Close button not found" }
$btn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
`;

type PendingRequest = {
  okMarker: string;
  errMarker: string;
  output: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

let worker: ChildProcessWithoutNullStreams | undefined;
let pending: PendingRequest | undefined;
let requestId = 0;
let queue: Promise<unknown> = Promise.resolve();

const settle = (error?: Error) => {
  if (!pending) return;
  const request = pending;
  pending = undefined;
  clearTimeout(request.timer);
  if (error) {
    request.reject(error);
  } else {
    request.resolve(request.output);
  }
};

const getWorker = () => {
  if (worker && worker.exitCode === null) {
    return worker;
  }
  const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "-"], {
    windowsHide: true,
  });
  worker = child;
  // every handler is a no-op once the child has been replaced, so deferred events from a
  // killed worker cannot settle a request that belongs to its replacement
  child.stdout.on("data", (chunk: Buffer) => {
    if (worker !== child || !pending) return;
    pending.output += chunk.toString("utf8");
    // markers are only matched as whole lines, so a request can never be terminated by a
    // tab title that happens to contain the marker text
    const lines = pending.output.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] === pending.okMarker) {
        pending.output = lines.slice(0, i).join("\n");
        settle();
        return;
      }
      if (lines[i].startsWith(pending.errMarker)) {
        settle(new Error(lines[i].slice(pending.errMarker.length).trim()));
        return;
      }
    }
  });
  child.on("error", (e) => {
    if (worker !== child) return;
    worker = undefined;
    settle(e);
  });
  child.on("exit", () => {
    if (worker !== child) return;
    worker = undefined;
    settle(new Error("PowerShell exited unexpectedly"));
  });
  child.stdin.write(psPrelude);
  return child;
};

// one PowerShell session serves all requests, so they run one at a time. PowerShell parses
// stdin like interactive input: a multi-line construct only executes once a blank line
// follows it, hence the blank line terminating every request.
const runScript = (script: string): Promise<string> => {
  const run = queue.then(
    () =>
      new Promise<string>((resolve, reject) => {
        const child = getWorker();
        const id = ++requestId;
        pending = {
          okMarker: `${OK_MARKER}${id}`,
          errMarker: `${ERR_MARKER}${id}`,
          output: "",
          resolve,
          reject,
          timer: setTimeout(() => {
            worker?.kill();
            worker = undefined;
            settle(new Error("PowerShell timed out"));
          }, RUN_TIMEOUT),
        };
        child.stdin.write(
          `try {\n${script}\nWrite-Output "${OK_MARKER}${id}"\n} catch {\nWrite-Output ("${ERR_MARKER}${id}" + $_.ToString())\n}\n\n`,
        );
      }),
  );
  queue = run.catch(() => {});
  return run;
};

// spawn the worker as soon as the command launches so the first action is already warm
if (process.platform === "win32") {
  getWorker();
}

export const jumpToBrowserTab = async (browser: Application, tab: Tab) => {
  try {
    return await runScript(scriptJumpToTab(tab.title));
  } catch (e) {
    console.error(`Error jumpToBrowserTab for ${browser.name}`);
    // same fallback as macOS: when the tab cannot be focused, open its URL instead
    try {
      if (tab.url) {
        await open(tab.url);
        return "";
      }
    } catch {
      // fall through to the failure HUD
    }
    await showHUD("Failed to focus tab");
    return String(e);
  }
};

export const closeBrowserTab = async (browser: Application, tab: Tab) => {
  try {
    return await runScript(scriptCloseTab(tab.title));
  } catch (e) {
    console.error(`Error closeBrowserTab for ${browser.name}`);
    return String(e);
  }
};

export const getBrowsersTabs = async (): Promise<BrowserTab[]> => {
  try {
    const tabs = await BrowserExtension.getTabs();
    if (tabs.length === 0) {
      return [];
    }
    let browser: Application = { name: "Browser", path: "" };
    try {
      browser = await getDefaultApplication(TEST_URL);
    } catch {
      // keep the generic fallback
    }
    const tabList = tabs.map((tab) => {
      let domain = "";
      try {
        domain = new URL(tab.url).hostname;
      } catch {
        // browser-internal pages may have non-standard URLs
      }
      return {
        browser: browser.name,
        title: tab.title ?? tab.url,
        url: tab.url,
        domain,
        windowId: "",
        tabId: String(tab.id),
        favicon: tab.favicon,
      };
    });
    return [{ browser, tabs: recentOnTop ? tabList.reverse() : tabList }];
  } catch (e) {
    captureException(e);
    console.error("Error fetching browser tabs");
    return [];
  }
};

// there is no per-browser setup on Windows: the tab list comes from the Browser Extension
export const getBrowserSetup = async (): Promise<BrowserSetup[]> => {
  return [];
};
