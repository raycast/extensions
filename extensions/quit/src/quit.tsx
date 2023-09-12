import { ActionPanel, Action, List, showHUD, Detail, Alert, confirmAlert, showToast, popToRoot } from "@raycast/api";
import { execSync } from "child_process";
import { runAppleScript, runAppleScriptSync } from "run-applescript";

function getAppPaths() {
  return execSync(`lsappinfo list | grep -B 4 'Foreground' | grep 'bundle path' | grep -o '".*"' | tr -d '"'`);
}

async function quitApp(appPath: string, appNames: Map<string, string>) {
  const appName: string = appPath == "" ? "" : appNames.get(appPath)!;
  const HUDmsg =
    appName == ""
      ? `🎉 Quit All Applications`
      : appName == "Finder"
      ? `🎉 Closed all ${appName} Windows`
      : `🎉 Quit ${appName}`;
  let quitScript: string;
  if (appPath == "") {
    let tempString = `{`;
    for (const [key, value] of appNames.entries()) {
      if (value == "Finder") {
        appNames.delete(key);
      } else {
        tempString = `${tempString}"${value}",`;
      }
    }
    quitScript = `
      tell application "Finder" to close windows
      do shell script "kill $(osascript -e 'tell app \\"System Events\\" to unix id of processes where background only is false and name is not \\"Finder\\"' | tr -d ,)"
    `;
    const options: Alert.Options = {
      title: "Changes might not be saved. Are you sure you want to force quit all apps?",
      primaryAction: {
        title: "Quit All",
        style: Alert.ActionStyle.Destructive,
        onAction: async () => {
          await showToast({ title: "Hang tight! Quitting all apps" });
          await runAppleScript(quitScript).then(() => {
            popToRoot();
            showHUD(HUDmsg);
          });
        },
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    };
    await confirmAlert(options);
  } else {
    quitScript = `
      try
        tell application "${appName}" to ${appName == "Finder" ? "close windows" : "quit"}
      end try 
    `;
    await runAppleScript(quitScript).then(() => {
      popToRoot();
      showHUD(HUDmsg);
    });
  }
}

function getAppName(str: string) {
  return str.substring(str.lastIndexOf("/") + 1, str.lastIndexOf("."));
}

function getAppNames(appPaths: string[]) {
  let appPath: string;
  const appNames: Map<string, string> = new Map();
  const finderWindowCount: number = parseInt(runAppleScriptSync(`tell application "Finder" to count of every window`));
  for (let i = 0; i < appPaths.length; i++) {
    appPath = appPaths[i];
    if (appPath.includes("Raycast.app") || (appPath.includes("Finder.app") && finderWindowCount == 0)) {
      appPaths.splice(i, 1);
      i--;
    } else {
      appNames.set(appPath, getAppName(appPath));
    }
  }
  return appNames;
}

export default function Command() {
  const appPaths: string[] = getAppPaths().toString().trim().split("\n");
  const appNames: Map<string, string> = getAppNames(appPaths);
  if (appPaths.length == 0) {
    return <Detail markdown={"No Application is Running"} />;
  } else {
    return (
      <List filtering={true}>
        <List.Item
          title="Quit All Applications"
          icon={{ fileIcon: "/Applications" }}
          actions={
            <ActionPanel>
              <Action title="Force Quit All" onAction={() => quitApp("", appNames)} />
            </ActionPanel>
          }
        />
        <List.Section title="Running Applications">
          {appPaths.map((appPath) => (
            <List.Item
              key={appPath}
              title={appNames.get(appPath)!}
              icon={{ fileIcon: appPath }}
              actions={
                <ActionPanel>
                  {appPath.includes("Finder.app") ? (
                    <Action
                      title={`Close All ${appNames.get(appPath)} Windows`}
                      onAction={() => quitApp(appPath, appNames)}
                    />
                  ) : (
                    <Action title={`Quit ${appNames.get(appPath)}`} onAction={() => quitApp(appPath, appNames)} />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }
}
