import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { GalleryActionSection } from "./actions/gallery";
import { RevealInFinderAction } from "./actions/reveal-in-finder";
import { NoArtifactsEmptyView, NoMatchesEmptyView, emptyViewForProblem } from "./components/empty-views";
import { formatRelativeDate } from "./utils/dates";
import { INDEX_PATH, readIndex } from "./utils/index-file";
import type { Artifact, IndexResult } from "./types/artifact";

const ALL_PROJECTS = "__all__";

/**
 * Bundled artifact glyph.
 *
 * `tintColor` is required, not cosmetic: passing the filename alone renders the
 * SVG's own fill, which is a fixed dark grey that disappears against Raycast's
 * dark theme. `Color.PrimaryText` is theme-aware, so the glyph tracks the same
 * color as the row's title in both light and dark.
 */
const ARTIFACT_ICON: Image.ImageLike = {
  source: "artifact_file.svg",
  tintColor: Color.PrimaryText,
};

const EMPTY_RESULT: IndexResult = { artifacts: [], projects: [] };

function ArtifactListItem({ artifact }: { artifact: Artifact }) {
  const relative = formatRelativeDate(artifact.updated);

  const accessories: List.Item.Accessory[] = [];
  if (artifact.owner === "shared") {
    accessories.push({ icon: Icon.TwoPeople, tooltip: "Shared with you" });
  }
  if (relative) {
    accessories.push({ text: relative, tooltip: `Updated ${artifact.updated}` });
  } else {
    // Shared artifacts report no date at all. Say so rather than leaving the
    // slot blank, which reads as a rendering bug.
    accessories.push({ text: "No date", tooltip: "This artifact has no recorded update date" });
  }

  return (
    <List.Item
      icon={ARTIFACT_ICON}
      title={artifact.title}
      subtitle={artifact.project}
      accessories={accessories}
      // Required for project search — do NOT delete as redundant with
      // `subtitle`. Raycast's built-in filter indexes "the title of list items
      // and additionally keywords" (@raycast/api docs); the subtitle is not
      // indexed, so without this, typing a project name matches nothing.
      keywords={artifact.project ? [artifact.project] : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open" url={artifact.url} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={artifact.url}
            shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={artifact.title}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          {artifact.cwd ? (
            <RevealInFinderAction title="Open Folder" path={artifact.cwd} shortcut={Keyboard.Shortcut.Common.Open} />
          ) : null}
          <GalleryActionSection />
          <ActionPanel.Section>
            <RevealInFinderAction
              title="Reveal Index File"
              // The FILE, not its directory — `showInFinder` selects the target
              // it is given, so passing the folder merely opened ~/.claude
              // without highlighting anything.
              path={INDEX_PATH}
              // No `Common` member covers "reveal the backing config file", so a
              // custom shortcut is correct. Plain object because `platforms` is
              // macOS-only — a `{ macOS, Windows }` pair here would imply a
              // portability this extension does not have.
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [project, setProject] = useState<string>(ALL_PROJECTS);

  const { data = EMPTY_RESULT, isLoading } = useCachedPromise(readIndex, [], {
    initialData: EMPTY_RESULT,
    // `readIndex` resolves rather than rejecting, so a failure arrives as a
    // `problem` on the payload and is rendered as a specific empty state.
    keepPreviousData: true,
  });

  const { artifacts, projects, problem, errorMessage } = data;

  // A stored filter can outlive the project it names — the last artifact from
  // that directory ages out, or the index is rebuilt. Treat a filter that no
  // longer matches any project as "All Projects" rather than filtering by it.
  //
  // Without this the view dead-ends: every artifact is filtered out, so the list
  // reads "No Matching Artifacts" while artifacts plainly exist, and once one or
  // fewer projects remain the dropdown unmounts — removing the only control that
  // could have selected All Projects again. `storeValue` does not save us here;
  // it governs which dropdown item is selected, not this filter state.
  const activeProject = project !== ALL_PROJECTS && !projects.includes(project) ? ALL_PROJECTS : project;

  const visible = useMemo(
    () => (activeProject === ALL_PROJECTS ? artifacts : artifacts.filter((a) => a.project === activeProject)),
    [artifacts, activeProject],
  );

  // Only offer the dropdown once there is something to filter by; a
  // single-option dropdown is noise.
  const searchBarAccessory =
    projects.length > 1 ? (
      <List.Dropdown tooltip="Filter by Project" storeValue onChange={setProject} value={activeProject}>
        <List.Dropdown.Item title="All Projects" value={ALL_PROJECTS} />
        <List.Dropdown.Section title="Projects">
          {projects.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    ) : undefined;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search artifacts by title or project…"
      searchBarAccessory={searchBarAccessory}
    >
      {problem ? (
        emptyViewForProblem(problem, errorMessage)
      ) : artifacts.length === 0 ? (
        <NoArtifactsEmptyView />
      ) : visible.length === 0 ? (
        <NoMatchesEmptyView />
      ) : (
        visible.map((artifact) => <ArtifactListItem key={artifact.id} artifact={artifact} />)
      )}
    </List>
  );
}
