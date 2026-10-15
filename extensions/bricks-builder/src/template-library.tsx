import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Color,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ReactNode } from "react";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { SnippetForm } from "./components/snippet-form";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import { elementTitle, getLibrary, getLibraryClipboard, outlineMarkdown } from "./lib/bricks-data";
import { Site } from "./lib/sites";

const TYPE_LABELS: Record<string, string> = {
  section: "Sections",
  header: "Headers",
  footer: "Footers",
  content: "Single",
  archive: "Archives",
  popup: "Popups",
  search: "Search Results",
  error: "Error Pages",
  password_protection: "Password Protection",
};
// Sections first: they're what gets pasted most.
const TYPE_ORDER = ["section", "popup", "content", "header", "footer", "archive", "search", "error"];
const COMPONENTS = "components";

const typeLabel = (type: string) => TYPE_LABELS[type] ?? elementTitle(type.replace(/_/g, "-"));
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface Source {
  kind: "template" | "component";
  id: string | number;
  name: string;
}

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [filter, setFilter] = useCachedState<string>("library:filter", "section");
  const [showingDetail, setShowingDetail] = useCachedState("library:detail", true);

  const { data, isLoading, error, revalidate } = useCachedPromise(getLibrary, [site as Site], {
    execute: Boolean(site),
    keepPreviousData: true,
  });

  if (!sitesLoading && sites.length === 0) {
    return (
      <NoSitesView
        onSaved={(saved) => {
          setSiteId(saved.id);
          reloadSites();
        }}
      />
    );
  }

  const templates = data?.templates ?? [];
  const components = data?.components ?? [];
  const types = [...new Set(templates.map((t) => t.template_type ?? "other"))].sort(
    (a, b) => (TYPE_ORDER.indexOf(a) + 1 || 99) - (TYPE_ORDER.indexOf(b) + 1 || 99),
  );
  const visibleTypes = filter === "all" ? types : types.filter((t) => t === filter);

  const sharedActions = (
    <ActionPanel.Section>
      <Action
        title={showingDetail ? "Hide Structure" : "Show Structure"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowingDetail(!showingDetail)}
      />
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
      <ManageSitesAction onPop={reloadSites} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={sitesLoading || isLoading}
      isShowingDetail={showingDetail && (templates.length > 0 || components.length > 0)}
      searchBarPlaceholder={
        site ? `Search templates and components on ${site.name}…` : "Search templates and components…"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="Everything" value="all" />
          <List.Dropdown.Item title="Components" value={COMPONENTS} icon={Icon.Box} />
          {types.map((t) => (
            <List.Dropdown.Item key={t} title={typeLabel(t)} value={t} icon={Icon.AppWindowGrid3x3} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorEmptyView error={error} actions={sharedActions} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.AppWindowGrid3x3}
          title={isLoading ? "Loading…" : "Nothing here yet"}
          description="Save sections as Bricks templates, or create global components, and they show up here."
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      )}
      {site && (filter === "all" || filter === COMPONENTS) && components.length > 0 && (
        <List.Section title="Components" subtitle={`${components.length}`}>
          {components.map((component) => (
            <List.Item
              key={component.id}
              icon={{ source: Icon.Box, tintColor: Color.Purple }}
              title={component.name}
              keywords={[component.category ?? "", component.description ?? "", "component"]}
              accessories={showingDetail ? [] : [{ text: `${component.elements} elements` }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${component.name}\n\n${component.description ? `${component.description}\n\n` : ""}${outlineMarkdown(component.outline, component.elements)}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Elements" text={`${component.elements}`} />
                      <List.Item.Detail.Metadata.Label title="Properties" text={`${component.properties}`} />
                      {component.category && (
                        <List.Item.Detail.Metadata.Label title="Category" text={component.category} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <LibraryActions
                  site={site}
                  source={{ kind: "component", id: component.id, name: component.name }}
                  extra={sharedActions}
                />
              }
            />
          ))}
        </List.Section>
      )}
      {site &&
        filter !== COMPONENTS &&
        visibleTypes.map((type) => {
          const ofType = templates.filter((t) => (t.template_type ?? "other") === type);
          return (
            <List.Section key={type} title={typeLabel(type)} subtitle={`${ofType.length}`}>
              {ofType.map((template) => (
                <List.Item
                  key={template.id}
                  icon={Icon.AppWindowGrid3x3}
                  title={template.title || "(no title)"}
                  keywords={[type, template.status]}
                  accessories={[
                    ...(template.status !== "publish" ? [{ tag: template.status }] : []),
                    ...(showingDetail ? [] : [{ text: `${template.elements} elements` }]),
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={`## ${template.title}\n\n${template.elements ? outlineMarkdown(template.outline, template.elements) : "_Empty template_"}`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Type" text={typeLabel(type)} />
                          <List.Item.Detail.Metadata.Label title="Elements" text={`${template.elements}`} />
                          <List.Item.Detail.Metadata.Label
                            title="Modified"
                            text={new Date(template.modified_gmt).toLocaleString()}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <LibraryActions
                      site={site}
                      source={{ kind: "template", id: template.id, name: template.title }}
                      extra={
                        <>
                          <Action.OpenInBrowser
                            title="Open Template in Bricks"
                            icon={Icon.Hammer}
                            url={template.builder_url}
                            shortcut={Keyboard.Shortcut.Common.Open}
                          />
                          {sharedActions}
                        </>
                      }
                    />
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

function LibraryActions(props: { site: Site; source: Source; extra: ReactNode }) {
  const { site, source } = props;
  const { push } = useNavigation();

  async function fetchClipboard(): Promise<string | undefined> {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Loading ${source.name}…` });
    try {
      const json = await getLibraryClipboard(site, source.kind, source.id);
      await toast.hide();
      return json;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't load ${source.name}`;
      toast.message = errorMessage(error);
      return undefined;
    }
  }

  return (
    <ActionPanel>
      <Action
        title="Paste into Bricks"
        icon={Icon.Clipboard}
        onAction={async () => {
          const json = await fetchClipboard();
          if (!json) return;
          await closeMainWindow();
          // Bricks reads its own copy format from the clipboard when you paste in the builder.
          await Clipboard.paste(json);
        }}
      />
      <Action
        title="Copy Elements"
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={async () => {
          const json = await fetchClipboard();
          if (!json) return;
          await Clipboard.copy(json);
          await showHUD(`Copied ${source.name}; paste it in Bricks with ⌘V`);
        }}
      />
      <Action
        title="Save as Snippet"
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={async () => {
          const json = await fetchClipboard();
          if (!json) return;
          push(<SnippetForm defaults={{ name: source.name, kind: "elements", content: json, tags: [site.name] }} />);
        }}
      />
      {props.extra}
    </ActionPanel>
  );
}
