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
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  AppSummary,
  Category,
  MacAppLibraryNotRunningError,
  aiDescribe,
  listApps,
  listCategories,
  pullCommunity,
  quitApp,
  submitCommunity,
} from "./lib/api";
import { EditMetadataForm } from "./components/EditMetadataForm";

export default function Categories() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    listCategories,
    [],
    { keepPreviousData: true },
  );

  if (error instanceof MacAppLibraryNotRunningError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="macAppLibrary is not running"
          description="Open the macAppLibrary app, then retry."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.Open title="Open Macapplibrary" target="macAppLibrary" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search categories">
      {(data ?? []).map((c: Category) => (
        <List.Item
          key={c.name}
          icon={Icon.Tag}
          title={c.name}
          accessories={[
            { tag: { value: String(c.appCount), color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Apps"
                icon={Icon.ArrowRight}
                target={<CategoryApps category={c.name} />}
              />
              <Action.CopyToClipboard
                title="Copy Category Name"
                content={c.name}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CategoryApps({ category }: { category: string }) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (c: string) => listApps({ category: c }),
    [category],
    {
      keepPreviousData: true,
    },
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={category}
      searchBarPlaceholder={`Search apps in ${category}`}
    >
      {(data ?? []).map((app) => (
        <CategoryAppItem key={app.bundleID} app={app} onChanged={revalidate} />
      ))}
    </List>
  );
}

function CategoryAppItem({
  app,
  onChanged,
}: {
  app: AppSummary;
  onChanged: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];
  if (app.isRunning)
    accessories.push({ tag: { value: "Running", color: Color.Green } });
  if (app.isFavorite) accessories.push({ icon: Icon.Star });
  if (app.version) accessories.push({ text: `v${app.version}` });

  return (
    <List.Item
      icon={{ fileIcon: app.bundlePath }}
      title={app.name}
      subtitle={app.developer ?? ""}
      accessories={accessories}
      keywords={[app.bundleID, app.developer ?? ""].filter(Boolean)}
      actions={
        <ActionPanel>
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
          <Action.Push
            title="Edit Metadata"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<EditMetadataForm app={app} onSaved={onChanged} />}
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
                const { prURL, prNumber } = await submitCommunity(app.bundleID);
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
          <Action.CopyToClipboard
            title="Copy Bundle Id"
            content={app.bundleID}
          />
        </ActionPanel>
      }
    />
  );
}
