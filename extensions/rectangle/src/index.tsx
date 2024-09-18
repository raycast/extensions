import {
  open,
  captureException,
  showToast,
  Toast,
  Action,
  getFrontmostApplication,
  closeMainWindow,
  Grid,
  ActionPanel,
  Icon,
} from "@raycast/api";
import { DetectedInstallation, ensureRectangleIsInstalled } from "./utils/checkInstall";
import { CommandGroups } from "./actions/interface";
import { RectangleAction, commandGroups as rectangleCommandGroups } from "./actions/rectangle";
import { RectangleProAction, commandGroups as rectangleProCommandGroups } from "./actions/rectangle-pro";
import { useEffect, useState } from "react";

type AllCommandGroups = CommandGroups<RectangleAction | RectangleProAction>;

export default function Command() {
  const [detectedInstallation, setDetectedInstallation] = useState<DetectedInstallation>();

  useEffect(() => {
    ensureRectangleIsInstalled().then((detectionResult) => {
      setDetectedInstallation(detectionResult);
    });
  }, []);

  const isLoading = detectedInstallation === undefined;

  const commandGroups: AllCommandGroups =
    detectedInstallation === "rectangle-pro" ? rectangleProCommandGroups : rectangleCommandGroups;

  const searchBarPlaceholderText =
    detectedInstallation === "rectangle-pro" ? "Find a Rectangle Pro action" : "Find a Rectangle action";

  return (
    <Grid inset={Grid.Inset.Medium} searchBarPlaceholder={searchBarPlaceholderText} isLoading={isLoading}>
      {Object.values(commandGroups).map((group) => (
        <Grid.Section title={group.title} key={group.title}>
          {group.items.map(({ name, title, icon, description }) => (
            <Grid.Item
              key={name}
              content={{
                value: {
                  source: {
                    light: icon,
                    dark: icon.replace(".png", "@dark.png"),
                  },
                },
                tooltip: description,
              }}
              title={title}
              subtitle={description}
              actions={
                <ActionPanel>
                  <Action title={`Execute ${title}`} onAction={() => buildCommand(name)()} icon={Icon.Play} />
                  <Action.CreateQuicklink
                    title={`Create Quicklink for ${title}`}
                    icon={Icon.Link}
                    quicklink={{ link: `${detectedInstallation}://execute-action?name=${name}`, name: title }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

export const buildCommand = (action: RectangleAction | RectangleProAction) => async () => {
  const installedVersion = await ensureRectangleIsInstalled();

  // bail out early if Rectangle is not found
  if (installedVersion === "none") {
    return;
  }

  const url = `${installedVersion}://execute-action?name=${action}`;

  try {
    await getFrontmostApplication();
  } catch (e: unknown) {
    captureException(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to run action "${action}: unable to obtain focused window"`,
    });
    return;
  }

  await closeMainWindow();

  try {
    await open(url);
  } catch (e: unknown) {
    captureException(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to run action "${action}"`,
    });
  }
};
