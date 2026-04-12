import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  getApplications,
  getDefaultApplication,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function runSwift(script: string, args: string[] = []): string {
  const tmpFile = join(tmpdir(), `raycast-my-browser-${Date.now()}.swift`);
  try {
    writeFileSync(tmpFile, script);
    const escapedArgs = args.map((a) => JSON.stringify(a)).join(" ");
    return execSync(`swift ${tmpFile} ${escapedArgs}`, { timeout: 20000 }).toString().trim();
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch {
      // ignore cleanup errors
    }
  }
}

function getHttpsHandlerBundleIds(): string[] {
  const output = runSwift(`
import Foundation
import CoreServices
let handlers = LSCopyAllHandlersForURLScheme("https" as CFString)?.takeRetainedValue() as? [String] ?? []
print(handlers.joined(separator: "\\n"))
`);
  return output.split("\n").filter(Boolean);
}

function setDefaultBrowser(bundleId: string): void {
  runSwift(
    `
import Foundation
import CoreServices
let id = CommandLine.arguments[1] as CFString
LSSetDefaultHandlerForURLScheme("https" as CFString, id)
LSSetDefaultHandlerForURLScheme("http" as CFString, id)
`,
    [bundleId],
  );
}

async function getInstalledBrowsers() {
  const registeredBundleIds = getHttpsHandlerBundleIds();
  const [apps, currentDefault] = await Promise.all([
    getApplications(),
    getDefaultApplication("https://raycast.com").catch(() => null),
  ]);

  const browsers = apps.filter((app) => app.bundleId && registeredBundleIds.includes(app.bundleId));
  return { browsers, currentDefaultBundleId: currentDefault?.bundleId ?? null };
}

export default function Command() {
  const { isLoading, data } = usePromise(getInstalledBrowsers);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search browsers...">
      {data?.browsers.map((browser) => {
        const isCurrent = browser.bundleId === data.currentDefaultBundleId;
        return (
          <List.Item
            key={browser.bundleId}
            icon={{ fileIcon: browser.path }}
            title={browser.name}
            accessories={isCurrent ? [{ icon: Icon.Checkmark, tooltip: "Current default" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title="Set as My Browser"
                  icon={Icon.Globe}
                  onAction={async () => {
                    const toast = await showToast({
                      style: Toast.Style.Animated,
                      title: `Setting ${browser.name} as default…`,
                      message: "Confirm the system dialog if one appears",
                    });
                    try {
                      setDefaultBrowser(browser.bundleId!);
                      toast.style = Toast.Style.Success;
                      toast.title = `${browser.name} is now your system's default browser`;
                      toast.message = undefined;
                    } catch {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Could not set system's default browser";
                      toast.message = "Make sure Xcode Command Line Tools are installed: xcode-select --install";
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
