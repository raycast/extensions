import { Color, Grid, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";

import { IconActions } from "./actions";
import { filterIconsByView, findIcon, getAssetPath, getConceptKeywords, getIconData, getIconKeywords } from "./data";
import { getPinnedIconNames, getRecentIconNames } from "./storage";
import type { CursorConcept, CursorIcon, PreferencesValues, ViewFilter } from "./types";

const data = getIconData();

export default function Command() {
  const preferences = getPreferenceValues<PreferencesValues>();
  const [view, setView] = useCachedState<ViewFilter>("view-filter", "all");
  const [, setStorageVersion] = useState(0);
  const columns = Number.parseInt(preferences.gridColumns, 10) || 8;
  const conceptIconNames = new Map<string, string[]>();
  const refreshStorage = () => setStorageVersion((version) => version + 1);

  for (const concept of data.concepts) {
    const labels = conceptIconNames.get(concept.iconName) || [];
    labels.push(concept.concept);
    conceptIconNames.set(concept.iconName, labels);
  }

  const visibleIcons = filterIconsByView(data.icons, view);
  const pinnedIconNames = getPinnedIconNames();
  const pinnedIcons = filterIconsByView(
    pinnedIconNames.flatMap((name) => {
      const icon = findIcon(name, data.icons);
      return icon ? [icon] : [];
    }),
    view,
  );
  const recentIcons = filterIconsByView(
    getRecentIconNames().flatMap((name) => {
      const icon = findIcon(name, data.icons);
      return icon ? [icon] : [];
    }),
    view,
  );
  const showConcepts = view === "all" || view === "concepts";
  const showSavedSections = view !== "concepts";
  const showAllIcons = view !== "concepts";

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Medium}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search Cursor icons..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter Cursor Icons"
          storeValue
          value={view}
          onChange={(newValue) => setView(newValue as ViewFilter)}
        >
          <Grid.Dropdown.Item title="All Icons" value="all" />
          <Grid.Dropdown.Item title="Concepts" value="concepts" />
          <Grid.Dropdown.Item title="Outline" value="outline" />
          <Grid.Dropdown.Item title="Filled" value="filled" />
        </Grid.Dropdown>
      }
    >
      {showSavedSections && pinnedIcons.length > 0 && (
        <Grid.Section title="Pinned Icons" subtitle={`${pinnedIcons.length}`}>
          {pinnedIcons.map((icon) => (
            <IconGridItem
              key={`pinned-${icon.name}`}
              itemId={`pinned-${icon.name}`}
              icon={icon}
              conceptLabels={conceptIconNames.get(icon.name)}
              showName={preferences.showName}
              primaryAction={preferences.primaryAction}
              pinnedIconNames={pinnedIconNames}
              isPinned
              onChange={refreshStorage}
            />
          ))}
        </Grid.Section>
      )}

      {showSavedSections && preferences.showRecent && recentIcons.length > 0 && (
        <Grid.Section title="Recent Icons" subtitle={`${recentIcons.length}`}>
          {recentIcons.map((icon) => (
            <IconGridItem
              key={`recent-${icon.name}`}
              itemId={`recent-${icon.name}`}
              icon={icon}
              conceptLabels={conceptIconNames.get(icon.name)}
              showName={preferences.showName}
              primaryAction={preferences.primaryAction}
              pinnedIconNames={pinnedIconNames}
              isRecent
              onChange={refreshStorage}
            />
          ))}
        </Grid.Section>
      )}

      {showConcepts && (
        <Grid.Section title="Concepts" subtitle={`${data.concepts.length}`}>
          {data.concepts.map((concept) => {
            const icon = findIcon(concept.iconName, data.icons);
            return icon ? (
              <ConceptGridItem
                key={concept.concept}
                concept={concept}
                icon={icon}
                showName={preferences.showName}
                primaryAction={preferences.primaryAction}
                isPinned={pinnedIconNames.includes(icon.name)}
                onChange={refreshStorage}
              />
            ) : null;
          })}
        </Grid.Section>
      )}

      {showAllIcons && (
        <Grid.Section
          title={view === "all" ? "All Icons" : view === "outline" ? "Outline Icons" : "Filled Icons"}
          subtitle={`${visibleIcons.length}`}
        >
          {visibleIcons.map((icon) => (
            <IconGridItem
              key={icon.name}
              itemId={`all-${icon.name}`}
              icon={icon}
              conceptLabels={conceptIconNames.get(icon.name)}
              showName={preferences.showName}
              primaryAction={preferences.primaryAction}
              pinnedIconNames={pinnedIconNames}
              isPinned={pinnedIconNames.includes(icon.name)}
              onChange={refreshStorage}
            />
          ))}
        </Grid.Section>
      )}

      {showConcepts || showAllIcons ? null : (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Cursor icons found"
          description="Try a different filter or search term."
        />
      )}
    </Grid>
  );
}

function IconGridItem(props: {
  itemId: string;
  icon: CursorIcon;
  conceptLabels?: string[];
  showName: boolean;
  primaryAction: PreferencesValues["primaryAction"];
  pinnedIconNames: string[];
  isPinned?: boolean;
  isRecent?: boolean;
  onChange: () => void;
}) {
  const {
    itemId,
    icon,
    conceptLabels = [],
    showName,
    primaryAction,
    pinnedIconNames,
    isPinned = false,
    isRecent = false,
    onChange,
  } = props;

  return (
    <Grid.Item
      id={itemId}
      content={{
        value: { source: icon.asset, fallback: Icon.Circle, tintColor: Color.PrimaryText },
        tooltip: icon.displayName,
      }}
      title={showName ? icon.name : undefined}
      subtitle={showName ? icon.style : undefined}
      keywords={getIconKeywords(icon, conceptLabels)}
      quickLook={{ path: getAssetPath(icon), name: `${icon.name}.svg` }}
      actions={
        <IconActions
          icon={icon}
          primaryAction={primaryAction}
          isPinned={isPinned || pinnedIconNames.includes(icon.name)}
          isRecent={isRecent}
          onChange={onChange}
        />
      }
    />
  );
}

function ConceptGridItem(props: {
  concept: CursorConcept;
  icon: CursorIcon;
  showName: boolean;
  primaryAction: PreferencesValues["primaryAction"];
  isPinned: boolean;
  onChange: () => void;
}) {
  const { concept, icon, showName, primaryAction, isPinned, onChange } = props;

  return (
    <Grid.Item
      id={`concept-${concept.concept}`}
      content={{
        value: { source: concept.asset, fallback: Icon.Circle, tintColor: Color.PrimaryText },
        tooltip: concept.concept,
      }}
      title={showName ? concept.concept : undefined}
      subtitle={showName ? icon.name : undefined}
      keywords={getConceptKeywords(concept, icon)}
      quickLook={{ path: getAssetPath(icon), name: `${icon.name}.svg` }}
      actions={<IconActions icon={icon} primaryAction={primaryAction} isPinned={isPinned} onChange={onChange} />}
    />
  );
}
