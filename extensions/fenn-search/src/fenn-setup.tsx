import {
  Action,
  ActionPanel,
  Application,
  Detail,
  getApplications,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { access } from "node:fs/promises";
import { useEffect, useState } from "react";
import { FENN_BUNDLE_ID, FENN_DOWNLOAD_URL, FENN_MIN_VERSION } from "./fenn-config";

async function findFenn(): Promise<Application | null> {
  const apps = await getApplications();
  const app = apps.find((item) => item.bundleId === FENN_BUNDLE_ID);
  if (app) return app;
  // Newly installed apps may not be registered with macOS yet.
  try {
    await access("/Applications/Fenn.app");
    return {
      name: "Fenn",
      path: "/Applications/Fenn.app",
      bundleId: FENN_BUNDLE_ID,
    };
  } catch {
    return null;
  }
}

export function useFennInstallation(revision: number) {
  // undefined means detection is pending or unavailable, not "not installed".
  const [app, setApp] = useState<Application | null>();
  useEffect(() => {
    let active = true;
    findFenn()
      .then((value) => {
        if (active) setApp(value);
      })
      .catch(() => {
        if (active) setApp(undefined);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return app;
}

async function openFenn() {
  try {
    const app = await findFenn();
    if (!app) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Install Fenn to Get Started",
        message: `Fenn ${FENN_MIN_VERSION} or newer is required.`,
        primaryAction: {
          title: "Download Fenn",
          onAction: () => open(FENN_DOWNLOAD_URL),
        },
      });
      return;
    }
    await open(app.path);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Open Fenn",
      message: "Open Fenn from Finder, finish setup, then retry your search.",
    });
  }
}

const SETUP_GUIDE = `# Search Your Files with Fenn

Requires **Fenn ${FENN_MIN_VERSION} or newer**, running on this Mac with a valid Fenn license. Raycast Pro is not required. Installing this extension does not include a Fenn license.

## 1. Install or update Fenn

[Download the latest Fenn](${FENN_DOWNLOAD_URL}), open the disk image, and drag Fenn into Applications. If updating, quit the old Fenn app before replacing it, then open the updated app.

## 2. Activate and finish setup

Open Fenn and enter the license key from your purchase email. Wait for license verification to finish and follow Fenn's setup steps. [Get a Fenn license](https://usefenn.com/#pricing) if you need one.

## 3. Choose what to search

Start with a small folder during Fenn's setup and let it finish indexing. Later, use **Sources → Folders → Add index folder** to include more folders, and **Sources → File Types** to choose the formats to index. Use **Sources → Apps** to configure supported app sources such as Apple Notes.

Allow the permissions Fenn requests for the sources you choose. Images, audio, and video require Fenn's Default model; Fast Mode searches text only.

## 4. Search from Raycast

Keep Fenn running. Return to **Search Fenn**, enter a query, and use **⌘P** for search modes or **⌘⇧F** for file-type filters. Use **⌘⇧R** to retry after opening, updating, or activating Fenn.

## If results are missing

Check that the folder and file type are enabled in Fenn's Sources and that indexing has finished. Clear Raycast's file-type filters or try Filename or Keyword mode. Raycast searches Fenn's existing index; choosing a filter here does not index new files. Screen memory is not included in this version of the extension.

## If Fenn cannot connect

Open Fenn ${FENN_MIN_VERSION} or newer and finish setup. If you just updated, quit and reopen Fenn, then retry. Leave the extension's **Fenn API Token** preference empty for normal setup; the connection is configured automatically. If you previously pasted a token, clear it in Extension Settings and retry.
`;

type SetupActionsProps = {
  app: Application | null | undefined;
  needsUpdate?: boolean;
  onRetry: () => void;
};

function SetupGuide({ app, needsUpdate, onRetry }: SetupActionsProps) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle="Set Up Fenn"
      markdown={SETUP_GUIDE}
      actions={
        <ActionPanel>
          <FennLaunchActions app={app} needsUpdate={needsUpdate} />
          <Action
            title="Back to Search"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              pop();
              onRetry();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function FennLaunchActions({ app, needsUpdate }: Omit<SetupActionsProps, "onRetry">) {
  const download = (
    <Action.OpenInBrowser
      title={needsUpdate ? "Download Latest Fenn" : "Download Fenn"}
      url={FENN_DOWNLOAD_URL}
      icon={Icon.Download}
    />
  );
  return (
    <>
      {(app === null || needsUpdate) && download}
      <Action title="Open Fenn" icon="icon.png" onAction={openFenn} />
      {app !== null && !needsUpdate && download}
    </>
  );
}

export function FennSetupActions(props: SetupActionsProps) {
  return (
    <>
      <FennLaunchActions app={props.app} needsUpdate={props.needsUpdate} />
      <Action.Push
        title="Open Setup Guide"
        icon={Icon.QuestionMarkCircle}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        target={<SetupGuide {...props} />}
      />
    </>
  );
}
