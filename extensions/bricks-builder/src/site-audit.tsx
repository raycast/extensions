import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactNode } from "react";
import { ImageList } from "./components/image-audit";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import {
  Audit,
  getAudit,
  ImageSummary,
  largeImageKb,
  restoreClasses,
  ShortPost,
  trashClasses,
  UnusedClass,
} from "./lib/bricks-data";
import { Site } from "./lib/sites";
import { adminEditUrl } from "./lib/wordpress";

type SectionKey = "classes" | "trash" | "templates" | "code" | "images" | "large-images" | "broken-images" | "heavy";

/** Element counts above these are worth a look (Bricks slows down in the builder first). */
const HEAVY = 500;
const BUSY = 250;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface SectionSummary {
  key: SectionKey;
  title: string;
  icon: Icon;
  count: number;
  subtitle: string;
  /** Count shown in red instead of orange. */
  severe?: boolean;
  /** Informational: no green check at 0, no warning color. */
  neutral?: boolean;
  /** Image checks open the image list with this filter. */
  imageFilter?: string;
  /** The site's helper plugin can't run this check yet. */
  unavailable?: boolean;
}

function summarize(audit: Audit): SectionSummary[] {
  const runsPhp = audit.code_elements.filter((c) => c.executes);
  const unsigned = runsPhp.filter((c) => c.signature !== "valid");
  const heavy = audit.heavy_pages.filter((p) => p.elements >= BUSY);
  const sections: SectionSummary[] = [
    {
      key: "classes",
      title: "Unused Global Classes",
      icon: Icon.Tag,
      count: audit.unused_classes.length,
      subtitle: "Not used by any element, template or component",
    },
    {
      key: "trash",
      title: "Class Trash",
      icon: Icon.Trash,
      count: audit.class_trash.length,
      subtitle: "Trashed classes you can restore",
      neutral: true,
    },
    {
      key: "templates",
      title: "Templates Without Conditions",
      icon: Icon.AppWindowGrid3x3,
      count: audit.templates_without_conditions.length,
      subtitle: "Headers, footers and single/archive templates that never show",
    },
    {
      key: "code",
      title: "Code Elements",
      icon: Icon.Code,
      count: audit.code_elements.length,
      subtitle:
        runsPhp.length > 0
          ? `${runsPhp.length} run PHP${unsigned.length > 0 ? `, ${unsigned.length} without a valid signature` : ""}`
          : `None run PHP · code execution ${audit.code_execution_enabled ? "enabled" : "disabled"}`,
      severe: unsigned.length > 0,
      neutral: runsPhp.length === 0,
    },
    ...imageSections(audit.images),
    {
      key: "heavy",
      title: "Heaviest Pages",
      icon: Icon.Gauge,
      count: heavy.length,
      subtitle: heavy.length > 0 ? `${BUSY}+ elements on a page` : `No page has ${BUSY}+ elements`,
      severe: audit.heavy_pages.some((p) => p.elements >= HEAVY),
    },
  ];
  return sections.filter((section) => section.key !== "trash" || section.count > 0);
}

/** Image rows of the overview. Audits from an older helper plugin (or cached from one) have no image summary. */
function imageSections(images: ImageSummary | undefined): SectionSummary[] {
  if (!images) {
    return [
      {
        key: "images",
        title: "Images",
        icon: Icon.Image,
        count: 0,
        subtitle: "Update the Bricks Raycast Helper plugin on this site to check images",
        unavailable: true,
        imageFilter: "issue:missing_alt",
      },
    ];
  }
  return [
    {
      key: "images",
      title: "Images Without Alt Text",
      icon: Icon.Image,
      count: images.missing_alt,
      subtitle: [
        `${images.used} images in Bricks`,
        images.dynamic > 0 ? `${images.dynamic} dynamic` : "",
        images.unused_library > 0 ? `${images.unused_library.toLocaleString()} unused in media library` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      imageFilter: "issue:missing_alt",
    },
    {
      key: "large-images",
      title: "Large Images",
      icon: Icon.Weights,
      count: images.large,
      subtitle: [
        `Serve over ${largeImageKb()} KB`,
        images.oversized > 0 ? `${images.oversized} wider than 2560px` : "",
        images.old_format > 0 ? `${images.old_format} could be WebP/AVIF` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      imageFilter: "issue:large",
    },
    {
      key: "broken-images",
      title: "Broken Images",
      icon: Icon.Warning,
      count: images.broken,
      subtitle: "Point to a missing file or media library item",
      severe: true,
      imageFilter: "issue:broken",
    },
  ];
}

function countAccessory(section: SectionSummary): List.Item.Accessory {
  if (section.unavailable) {
    return { icon: { source: Icon.Warning, tintColor: Color.SecondaryText }, tooltip: section.subtitle };
  }
  if (section.count === 0 && !section.neutral) {
    return { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Nothing to fix" };
  }
  const color = section.neutral ? Color.SecondaryText : section.severe ? Color.Red : Color.Orange;
  return { tag: { value: `${section.count}`, color } };
}

/** Opens on an overview of the audit; ↵ on a row shows that part of it. */
export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();

  const { data, isLoading, error, revalidate } = useCachedPromise(getAudit, [site as Site, largeImageKb()], {
    execute: Boolean(site),
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

  const siteActions = (
    <ActionPanel.Section>
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
      searchBarPlaceholder={site ? `Search the audit on ${site.name}…` : "Search the audit…"}
    >
      {error ? (
        <ErrorEmptyView error={error} actions={siteActions} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Auditing…" />
      )}
      {site &&
        data &&
        summarize(data).map((section) => (
          <List.Item
            key={section.key}
            icon={section.icon}
            title={section.title}
            subtitle={section.subtitle}
            accessories={[countAccessory(section)]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Show ${section.title}`}
                  icon={Icon.ArrowRight}
                  target={
                    section.imageFilter ? (
                      <ImageList site={site} preset={section.imageFilter} />
                    ) : (
                      <AuditSection site={site} sectionKey={section.key} />
                    )
                  }
                  onPop={revalidate}
                />
                {siteActions}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

/** One part of the audit as its own list. Shares the audit cache with the overview. */
function AuditSection(props: { site: Site; sectionKey: SectionKey }) {
  const { site, sectionKey } = props;
  const { data, isLoading, error, revalidate } = useCachedPromise(getAudit, [site, largeImageKb()], {});
  const summary = data ? summarize(data).find((s) => s.key === sectionKey) : undefined;
  const title = summary?.title ?? "Site Audit";

  const siteActions = (
    <ActionPanel.Section>
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${title} · ${site.name}`}
      searchBarPlaceholder={`Filter ${title.toLowerCase()}…`}
    >
      {error ? (
        <ErrorEmptyView error={error} actions={siteActions} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={isLoading ? "Loading…" : "Nothing to fix here"}
        />
      )}
      {data && (sectionKey === "classes" || sectionKey === "trash") && (
        <ClassSections site={site} audit={data} show={sectionKey} onChange={revalidate} siteActions={siteActions} />
      )}
      {data &&
        sectionKey === "templates" &&
        data.templates_without_conditions.map((template) => (
          <List.Item
            key={template.id}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={template.title || "(no title)"}
            keywords={[template.template_type]}
            accessories={[
              ...(template.status !== "publish" ? [{ tag: template.status }] : []),
              { tag: { value: template.template_type, color: Color.Magenta } },
            ]}
            actions={<PostActions site={site} post={template} extra={siteActions} />}
          />
        ))}
      {data && sectionKey === "code" && (
        <List.Section title={`Code execution ${data.code_execution_enabled ? "enabled" : "disabled"}`}>
          {[...data.code_elements]
            .sort((a, b) => Number(b.executes) - Number(a.executes))
            .map((code) => {
              const signatureOk = code.signature === "valid";
              return (
                <List.Item
                  key={`${code.post.id}-${code.element.id}`}
                  icon={
                    code.executes
                      ? { source: Icon.Terminal, tintColor: signatureOk ? Color.Orange : Color.Red }
                      : Icon.Code
                  }
                  title={code.post.title || "(no title)"}
                  subtitle={code.element.label ?? `#brxe-${code.element.id}`}
                  keywords={code.languages}
                  accessories={[
                    ...(code.executes
                      ? [
                          {
                            tag: {
                              value: `signature ${code.signature}`,
                              color: signatureOk ? Color.Green : Color.Red,
                            },
                            tooltip: signatureOk
                              ? "Signed by an admin; Bricks will run it"
                              : "Bricks won't run unsigned code. Re-sign it in Bricks › Settings › Custom Code if you trust it",
                          },
                          { tag: { value: "runs PHP", color: Color.Red } },
                        ]
                      : []),
                    ...code.languages.filter((l) => l !== "php").map((l) => ({ tag: l })),
                  ]}
                  actions={
                    <PostActions
                      site={site}
                      post={code.post}
                      extra={
                        <>
                          <Action.CopyToClipboard
                            title="Copy Element ID"
                            content={`#brxe-${code.element.id}`}
                            shortcut={Keyboard.Shortcut.Common.Copy}
                          />
                          {siteActions}
                        </>
                      }
                    />
                  }
                />
              );
            })}
        </List.Section>
      )}
      {data && sectionKey === "heavy" && (
        <List.Section title="Elements per page, header and footer included">
          {data.heavy_pages.map(({ post, elements }) => (
            <List.Item
              key={post.id}
              icon={Icon.Gauge}
              title={post.title || "(no title)"}
              subtitle={post.type_label}
              accessories={[
                {
                  tag: {
                    value: `${elements} elements`,
                    color: elements >= HEAVY ? Color.Red : elements >= BUSY ? Color.Orange : Color.SecondaryText,
                  },
                },
              ]}
              actions={<PostActions site={site} post={post} extra={siteActions} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function PostActions(props: { site: Site; post: ShortPost; extra?: ReactNode }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open in Bricks" icon={Icon.Hammer} url={props.post.builder_url} />
      <Action.OpenInBrowser
        title="Open Live Page"
        icon={Icon.Globe}
        url={props.post.link}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action.OpenInBrowser
        title="Edit in WordPress Admin"
        icon={Icon.Pencil}
        url={adminEditUrl(props.site, props.post.id)}
        shortcut={Keyboard.Shortcut.Common.Edit}
      />
      {props.extra}
    </ActionPanel>
  );
}

function ClassSections(props: {
  site: Site;
  audit: Audit;
  show: "classes" | "trash";
  onChange: () => void;
  siteActions: ReactNode;
}) {
  const { site, audit, onChange } = props;
  // Name-only classes usually come from a CSS framework (Core Framework, ACSS…) so they show up in the
  // class picker; they're listed but left out of "trash all".
  const styled = audit.unused_classes.filter((c) => c.has_styles);

  async function trash(classes: UnusedClass[]) {
    const names = classes.length === 1 ? `.${classes[0].name}` : `${classes.length} unused classes`;
    const confirmed = await confirmAlert({
      title: `Move ${names} to the trash?`,
      message:
        "No element, template or component on the site uses them. Classes used only in custom code or HTML can't be detected. You can restore them here or in the builder's Style Manager.",
      primaryAction: { title: "Move to Trash", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Moving ${names} to the trash…` });
    try {
      const result = await trashClasses(
        site,
        classes.map((c) => c.id),
      );
      onChange();
      const ids = result.trashed.map((c) => c.id);
      toast.style = Toast.Style.Success;
      toast.title = `Moved ${result.trashed.length} ${result.trashed.length === 1 ? "class" : "classes"} to the trash`;
      toast.message = result.skipped.length > 0 ? `${result.skipped.length} skipped: in use now` : undefined;
      toast.primaryAction = {
        title: "Undo",
        shortcut: { modifiers: ["cmd"], key: "z" },
        onAction: async () => {
          await restoreClasses(site, ids);
          onChange();
          await showToast({ style: Toast.Style.Success, title: "Restored" });
        },
      };
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't move them to the trash";
      toast.message = errorMessage(error);
    }
  }

  async function restore(ids: string[]) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Restoring…" });
    try {
      const result = await restoreClasses(site, ids);
      onChange();
      toast.style = Toast.Style.Success;
      toast.title = `Restored ${result.restored.map((c) => `.${c.name}`).join(", ")}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't restore";
      toast.message = errorMessage(error);
    }
  }

  const trashAll = audit.can_manage && styled.length > 0 && (
    <Action
      title={`Move ${styled.length} Unused Classes to Trash`}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
      onAction={() => trash(styled)}
    />
  );

  return (
    <>
      {props.show === "classes" && (
        <List.Section
          title={audit.can_manage ? "Moved to Bricks' class trash, restorable" : "Only administrators can trash them"}
        >
          {audit.unused_classes.map((cls) => (
            <List.Item
              key={cls.id}
              icon={Icon.Tag}
              title={`.${cls.name}`}
              subtitle={cls.category ?? undefined}
              keywords={[cls.name, ...(cls.category ? [cls.category] : [])]}
              accessories={
                cls.has_styles
                  ? []
                  : [
                      {
                        tag: "name only",
                        tooltip: "No styles in Bricks; probably from a CSS framework. Not in trash all.",
                      },
                    ]
              }
              actions={
                <ActionPanel>
                  {audit.can_manage && (
                    <Action
                      title="Move to Trash"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => trash([cls])}
                    />
                  )}
                  {trashAll}
                  <Action.CopyToClipboard
                    title="Copy Class Name"
                    content={cls.name}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {props.siteActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {props.show === "trash" && (
        <List.Section title="Also restorable in the builder's Style Manager">
          {audit.class_trash.map((cls) => (
            <List.Item
              key={cls.id}
              icon={{ source: Icon.Trash, tintColor: Color.SecondaryText }}
              title={`.${cls.name}`}
              accessories={cls.deleted_at ? [{ date: new Date(cls.deleted_at), tooltip: "Moved to trash" }] : []}
              actions={
                <ActionPanel>
                  {audit.can_manage && (
                    <Action
                      title="Restore Class"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => restore([cls.id])}
                    />
                  )}
                  {audit.can_manage && audit.class_trash.length > 1 && (
                    <Action
                      title="Restore All"
                      icon={Icon.ArrowCounterClockwise}
                      onAction={() => restore(audit.class_trash.map((c) => c.id))}
                    />
                  )}
                  {props.siteActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </>
  );
}
