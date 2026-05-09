import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showInFinder,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  AppSummary,
  aiDescribe,
  pullCommunity,
  quitApp,
  submitCommunity,
  updateApp,
} from "../lib/api";
import { EditMetadataForm } from "./EditMetadataForm";

export function AppItem({
  app,
  onChanged,
}: {
  app: AppSummary;
  onChanged: () => void;
}) {
  const subtitle = app.developer ?? "";
  const accessories: List.Item.Accessory[] = [];
  if (app.isRunning)
    accessories.push({ tag: { value: "Running", color: Color.Green } });
  if (app.isFavorite) accessories.push({ icon: Icon.Star });
  if (app.categories?.length)
    accessories.push({ text: app.categories.join(", ") });
  if (app.version) accessories.push({ text: `v${app.version}` });

  return (
    <List.Item
      icon={{ fileIcon: app.bundlePath }}
      title={app.name}
      subtitle={subtitle}
      accessories={accessories}
      keywords={[
        app.bundleID,
        ...(app.categories ?? []),
        app.developer ?? "",
        app.description ?? "",
      ].filter(Boolean)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              title="Open App"
              target={app.bundlePath}
              icon={Icon.AppWindow}
            />
            <Action
              title="Reveal in Finder"
              icon={Icon.Finder}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => showInFinder(app.bundlePath)}
            />
            {app.isRunning && (
              <Action
                title="Quit App"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                onAction={async () => {
                  try {
                    await quitApp(app.bundleID);
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Quit ${app.name}`,
                    });
                    onChanged();
                  } catch (e) {
                    await showFailureToast(e, {
                      title: `Failed to quit ${app.name}`,
                    });
                  }
                }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Metadata">
            <Action
              title={app.isFavorite ? "Remove Favorite" : "Mark as Favorite"}
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              onAction={async () => {
                try {
                  await updateApp(app.bundleID, {
                    isFavorite: !app.isFavorite,
                  });
                  await showToast({
                    style: Toast.Style.Success,
                    title: app.isFavorite
                      ? `Removed ${app.name} from favorites`
                      : `Favorited ${app.name}`,
                  });
                  onChanged();
                } catch (e) {
                  await showFailureToast(e, {
                    title: "Could not update favorite",
                  });
                }
              }}
            />
            <Action.Push
              title="Edit Metadata"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<EditMetadataForm app={app} onSaved={onChanged} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Community">
            <Action
              title="Pull Community Data"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={async () => {
                try {
                  await pullCommunity(app.bundleID);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Pulled community data for ${app.name}`,
                  });
                  onChanged();
                } catch (e) {
                  await showFailureToast(e, { title: "Pull failed" });
                }
              }}
            />
            <Action
              title="Submit to Community"
              icon={Icon.Upload}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: `Submit ${app.name} to the community?`,
                  message:
                    "This opens a pull request on the macAppLibrary repo for review.",
                  primaryAction: { title: "Submit" },
                });
                if (!ok) return;
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Submitting…",
                });
                try {
                  const { prURL, prNumber } = await submitCommunity(
                    app.bundleID,
                  );
                  toast.style = Toast.Style.Success;
                  toast.title = `Submitted (PR #${prNumber})`;
                  toast.primaryAction = {
                    title: "Open PR",
                    onAction: () => open(prURL),
                  };
                } catch (e) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Submission failed";
                  toast.message = e instanceof Error ? e.message : String(e);
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="AI">
            <Action
              title="Generate AI Description"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: `Generating description for ${app.name}…`,
                });
                try {
                  await aiDescribe(app.bundleID);
                  toast.style = Toast.Style.Success;
                  toast.title = "Description generated";
                  onChanged();
                } catch (e) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "AI describe failed";
                  toast.message = e instanceof Error ? e.message : String(e);
                }
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Bundle Id"
              content={app.bundleID}
            />
            {app.websiteURL && <Action.OpenInBrowser url={app.websiteURL} />}
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              onAction={onChanged}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
