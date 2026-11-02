import { Action, ActionPanel, Color, Grid, Icon, Keyboard, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo, useState } from "react";
import { Font, fontKeywords, FONTSHARE_URL } from "./api";
import { ALL_FONTS, buildFilterSections, FilterSection, matchesFilter } from "./filters";
import FontDetail from "./font-detail";
import { FontActions } from "./font-actions";
import { PREVIEW_PLACEHOLDER, useFontPreviews } from "./preview";
import { useCatalog } from "./use-catalog";

type Layout = "grid" | "list";

const TOGGLE_LAYOUT_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "l" },
  Windows: { modifiers: ["ctrl", "shift"], key: "l" },
};

const SEARCH_PLACEHOLDER = "Search by name, designer, category or tag";

function styleCount(font: Font): string {
  return `${font.styles.length} ${font.styles.length === 1 ? "style" : "styles"}`;
}

export default function Command() {
  const {
    fonts: { data: fonts, isLoading, error, revalidate },
    catalog,
  } = useCatalog("fonts");
  const { value: storedLayout, setValue: setLayout, isLoading: isLoadingLayout } = useLocalStorage<Layout>("layout");
  const [filter, setFilter] = useState(ALL_FONTS);

  const layout = storedLayout ?? "grid";
  const { files: previews, isRendering } = useFontPreviews(fonts, layout === "grid");
  const sections = useMemo(() => buildFilterSections(fonts ?? []), [fonts]);
  const visibleFonts = useMemo(() => (fonts ?? []).filter((font) => matchesFilter(font, filter)), [fonts, filter]);

  const toggleLayout = (
    <Action
      title={layout === "grid" ? "Show as List" : "Show as Grid"}
      icon={layout === "grid" ? Icon.List : Icon.AppWindowGrid3x3}
      shortcut={TOGGLE_LAYOUT_SHORTCUT}
      onAction={() => setLayout(layout === "grid" ? "list" : "grid")}
    />
  );

  const actionsFor = (font: Font) => (
    <FontActions font={font} extra={toggleLayout}>
      <Action.Push title="Show Details" icon={Icon.Sidebar} target={<FontDetail font={font} catalog={catalog} />} />
    </FontActions>
  );

  const errorView = {
    icon: Icon.ExclamationMark,
    title: "Could not load fonts",
    description: error?.message,
    actions: (
      <ActionPanel>
        <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <Action.OpenInBrowser title="Open Fontshare" url={FONTSHARE_URL} />
      </ActionPanel>
    ),
  };
  const emptyView = {
    icon: Icon.Text,
    title: "No fonts found",
    description: "Try a different name, designer, tag or filter.",
    actions: <ActionPanel>{toggleLayout}</ActionPanel>,
  };
  const showError = Boolean(error && !fonts);

  if (layout === "grid") {
    return (
      <Grid
        columns={5}
        inset={Grid.Inset.Large}
        isLoading={isLoading || isLoadingLayout || isRendering}
        searchBarPlaceholder={SEARCH_PLACEHOLDER}
        searchBarAccessory={<GridFilterDropdown sections={sections} value={filter} onChange={setFilter} />}
      >
        <Grid.EmptyView {...(showError ? errorView : emptyView)} />
        {visibleFonts.map((font) => (
          <Grid.Item
            key={font.id}
            title={font.name}
            subtitle={styleCount(font)}
            keywords={fontKeywords(font)}
            content={{
              value: previews[font.id]
                ? { source: previews[font.id], tintColor: Color.PrimaryText }
                : PREVIEW_PLACEHOLDER,
              tooltip: [font.categories.join(", "), font.designers.join(", ")].filter(Boolean).join(" · "),
            }}
            actions={actionsFor(font)}
          />
        ))}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingLayout}
      searchBarPlaceholder={SEARCH_PLACEHOLDER}
      searchBarAccessory={<ListFilterDropdown sections={sections} value={filter} onChange={setFilter} />}
    >
      <List.EmptyView {...(showError ? errorView : emptyView)} />
      {visibleFonts.map((font) => (
        <List.Item
          key={font.id}
          icon={Icon.Text}
          title={font.name}
          subtitle={font.designers.join(", ")}
          keywords={fontKeywords(font)}
          accessories={[
            ...font.categories.map((category) => ({ tag: category, tooltip: "Category" })),
            { text: styleCount(font), tooltip: "Styles" },
          ]}
          actions={actionsFor(font)}
        />
      ))}
    </List>
  );
}

function ListFilterDropdown(props: { sections: FilterSection[]; value: string; onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter Fonts" value={props.value} onChange={props.onChange}>
      <List.Dropdown.Item title="All Fonts" value={ALL_FONTS} />
      {props.sections.map((section) => (
        <List.Dropdown.Section key={section.title} title={section.title}>
          {section.options.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

function GridFilterDropdown(props: { sections: FilterSection[]; value: string; onChange: (value: string) => void }) {
  return (
    <Grid.Dropdown tooltip="Filter Fonts" value={props.value} onChange={props.onChange}>
      <Grid.Dropdown.Item title="All Fonts" value={ALL_FONTS} />
      {props.sections.map((section) => (
        <Grid.Dropdown.Section key={section.title} title={section.title}>
          {section.options.map((option) => (
            <Grid.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </Grid.Dropdown.Section>
      ))}
    </Grid.Dropdown>
  );
}
