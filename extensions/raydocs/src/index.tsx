import LinkItem from "@/components/LinkItem";
import { Link } from "@/types";
import { getLinks } from "@/utils/links";
import { getLinkAppearance } from "@/utils/sections";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, useCachedPromise, useFrecencySorting } from "@raycast/utils";

export default function Command() {
  const [section, setSection] = useState("");
  const { data, isLoading, error, revalidate } = useCachedPromise(getLinks, [], {
    initialData: [],
    onError: () => {
      // Suppress the hook's default failure toast — we decide below whether cached data
      // makes the full-screen error EmptyView (no toast) or the list (toast) the right surface.
    },
  });
  const { data: sortedLinks, visitItem } = useFrecencySorting(data);

  const hasCachedData = data.length > 0;

  // Fires once per distinct `error` reference (a new Error instance each failed fetch/revalidate),
  // never on a re-render where `error` is unchanged — so it can't double-fire for one failure.
  // `data` is read from this render's closure rather than listed as a dependency, so it reflects
  // whatever was current at the moment this particular error appeared, not a stale earlier value.
  useEffect(() => {
    if (error && hasCachedData) {
      showFailureToast(error, { title: "Failed to Refresh Documentation" });
    }
  }, [error]);

  const renderLink = (link: Link) => <LinkItem key={link.id} link={link} onVisit={visitItem} revalidate={revalidate} />;

  const sections = [
    ...new Set(data.map((link) => link.sectionTitle).filter((title): title is string => Boolean(title))),
  ];

  // A refresh can remove or rename the selected section. Deriving the active value rather than
  // syncing it in an effect means the dropdown never holds a value it no longer offers, so the
  // list can't render "No Matching Docs" over valid data.
  const activeSection = sections.includes(section) ? section : "";

  // The derived value above keeps this render correct with no flash; this clears the stored
  // selection so a section that disappears and later returns doesn't silently re-filter to it.
  useEffect(() => {
    if (section !== activeSection) {
      setSection(activeSection);
    }
  }, [section, activeSection]);

  const filteredLinks = activeSection ? sortedLinks.filter((link) => link.sectionTitle === activeSection) : sortedLinks;
  const uncategorized = filteredLinks.filter((link) => !link.sectionTitle);
  const visibleSections = sections.filter((title) => filteredLinks.some((link) => link.sectionTitle === title));

  if (error && !hasCachedData) {
    return (
      <List>
        <List.EmptyView
          title="Failed to Load Documentation"
          description="Check your internet connection, then refresh to try again."
          actions={
            <ActionPanel>
              <Action
                title="Refresh Docs"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <Action.CopyToClipboard title="Copy Error" content={error.message} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Section" value={activeSection} onChange={setSection}>
          <List.Dropdown.Item title="All Sections" value="" />
          {sections.map((title) => (
            <List.Dropdown.Item key={title} title={title} value={title} icon={getLinkAppearance(title, false)} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && (
        <List.EmptyView
          title="No Matching Docs"
          description="Try a different search term or choose a different section."
        />
      )}
      {visibleSections.map((title) => (
        <List.Section key={title} title={title}>
          {filteredLinks.filter((link) => link.sectionTitle === title).map(renderLink)}
        </List.Section>
      ))}
      {uncategorized.length > 0 && <List.Section title="Uncategorized">{uncategorized.map(renderLink)}</List.Section>}
    </List>
  );
}
