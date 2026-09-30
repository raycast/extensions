import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";

import { GalleryActionSection } from "../actions/gallery";
import { RevealInFinderAction } from "../actions/reveal-in-finder";
import { HookSetupDetail } from "./hook-setup";
import { SETUP_DOCS_URL, SETUP_PROMPT } from "../utils/hook-status";
import { INDEX_PATH } from "../utils/index-file";
import type { IndexProblem } from "../types/artifact";

/**
 * `List.EmptyView` descriptions must stay ONE short line — the component
 * collapses newlines, so a multi-line string renders as a run-on sentence.
 * Multi-step guidance belongs in the actions below it.
 */
export function NotInstalledEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="Artifact Index Not Found"
      description="Install the Claude Code hook to start tracking artifacts as you publish them."
      actions={
        <ActionPanel>
          {/*
            "View Setup Instructions" stays FIRST, and therefore stays the
            Enter default, because it was the default before this state gained
            any setup actions. The new ones are appended rather than inserted.

            The in-app screen below is the better destination and it would be
            tempting to promote it — but silently repointing the default action
            of an already-shipped surface is a change users did not ask for,
            and one keystroke is a cheap price for not making it.
          */}
          <Action.OpenInBrowser title="View Setup Instructions" icon={Icon.Book} url={SETUP_DOCS_URL} />
          {/*
            Same destination as the warning row's: first run and
            silently-broken are the same problem at different times, and the
            two must not drift into different instructions.
          */}
          <Action.Push title="Set up Artifact Tracking" icon={Icon.Plug} target={<HookSetupDetail />} />
          <Action.CopyToClipboard
            title="Copy Setup Prompt"
            icon={Icon.Clipboard}
            content={SETUP_PROMPT}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard title="Copy Index Path" icon={Icon.Finder} content={INDEX_PATH} />
          <GalleryActionSection />
        </ActionPanel>
      }
    />
  );
}

export function MalformedEmptyView({ errorMessage }: { errorMessage?: string }) {
  const detail = errorMessage ?? `Could not read ${INDEX_PATH}.`;

  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Artifact Index Unreadable"
      description="The index file exists but could not be parsed as JSON."
      actions={
        <ActionPanel>
          <RevealInFinderAction title="Show Index File" path={INDEX_PATH} />
          <Action.CopyToClipboard title="Copy Error" icon={Icon.Clipboard} content={detail} />
          <Action.CopyToClipboard title="Copy Index Path" icon={Icon.Document} content={INDEX_PATH} />
          <GalleryActionSection />
        </ActionPanel>
      }
    />
  );
}

/** The index loaded fine and simply has nothing in it yet. */
export function NoArtifactsEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Document}
      title="No Artifacts Tracked Yet"
      description="Publish an artifact in Claude Code and it will appear here."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View Setup Instructions" icon={Icon.Book} url={SETUP_DOCS_URL} />
          <GalleryActionSection />
        </ActionPanel>
      }
    />
  );
}

/**
 * A query or project filter matched nothing — distinct from an empty index.
 *
 * Carries the gallery actions because "no match" has two very different causes:
 * the search term is wrong, or the artifact was never recorded here at all
 * (published from the chat app, or from another machine). Only the galleries
 * resolve the second, and without them this state is a dead end.
 */
export function NoMatchesEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Matching Artifacts"
      description="Try a different search term, or look in the galleries on claude.ai."
      actions={
        <ActionPanel>
          <GalleryActionSection />
        </ActionPanel>
      }
    />
  );
}

export function emptyViewForProblem(problem: IndexProblem, errorMessage?: string, hookRegistered = false) {
  if (problem === "malformed") return <MalformedEmptyView errorMessage={errorMessage} />;

  // The index file does not exist yet. That looks like "the hook was never
  // installed" — but only if it wasn't. When a recorder IS registered, the
  // file is simply absent until the first publish writes it, which is the
  // ordinary "nothing recorded yet" state and needs no setup instructions.
  // Routing here regardless sent a correctly configured user to reinstall
  // something that was already working.
  return hookRegistered ? <NoArtifactsEmptyView /> : <NotInstalledEmptyView />;
}
