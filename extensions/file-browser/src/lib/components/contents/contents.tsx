import { List, Grid } from "@raycast/api";
import { createContext, useContext } from "react";
import type { ContentsProps, ViewComponents, ViewRegistry } from "./types";

const viewComponents: ViewRegistry = {
  list: {
    view: "list",
    Container: List,
    Item: List.Item,
    Dropdown: List.Dropdown,
  },
  grid: {
    view: "grid",
    Container: Grid,
    Item: Grid.Item,
    Dropdown: Grid.Dropdown,
  },
};

const ContentsContext = createContext<ViewComponents>(viewComponents.list);

export const useContentsView = () => useContext(ContentsContext);

export const ContentsRoot = ({
  children,
  counts,
  isLoading,
  view,
  path,
  columns,
  searchBarAccessory,
  searchBarPlaceholder,
  emptyTitle,
  emptyDescription,
  sectionTitle,
  sectionSubtitle,
  sections,
  actions,
}: ContentsProps) => {
  const components = viewComponents[view ?? "list"];
  const ContentsComponent = components.Container;

  const resolvedEmptyTitle = emptyTitle ?? "No Items";
  const resolvedEmptyDescription = emptyDescription ?? "This directory does not contain visible entries.";
  const resolvedSectionTitle = sectionTitle ?? `Items • ${counts}`;
  const resolvedSections =
    sections && sections.length > 0
      ? sections
      : [
          {
            title: resolvedSectionTitle,
            subtitle: sectionSubtitle,
            children,
          },
        ];

  return (
    <ContentsContext.Provider value={components}>
      <ContentsComponent
        isLoading={isLoading}
        searchBarPlaceholder={searchBarPlaceholder ?? `Search in ${path}`}
        searchBarAccessory={searchBarAccessory}
        columns={view === "grid" ? columns : undefined}
        actions={actions}
      >
        <ContentsComponent.EmptyView title={resolvedEmptyTitle} description={resolvedEmptyDescription} />
        {resolvedSections.map((section) => (
          <ContentsComponent.Section key={section.title} title={section.title} subtitle={section.subtitle}>
            {section.children}
          </ContentsComponent.Section>
        ))}
      </ContentsComponent>
    </ContentsContext.Provider>
  );
};
