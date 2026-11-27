// The look Grid and the full-width preview, and the actions both share.
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Grid,
  Icon,
  Keyboard,
  environment,
  getDefaultApplication,
  open,
  showHUD,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { REPO_SECTIONS } from "glancecard";
import { STARS } from "glancecard/setup";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { useState, type ReactElement } from "react";
import {
  cardFile,
  exportFile,
  exportName,
  targetTitle,
  targetUrl,
  type Card,
  type CardOptions,
  type Target,
} from "../lib/cards";
import { useCard, useCardOptions } from "../lib/hooks";
import { choiceFor, defaultLook, lookGroups, lookTitle, otherSide, seasonNote } from "../lib/looks";
import { UseOnGitHub, type SetupRequest } from "./setup-form";

/** Every look of a card, each drawn with the card's own data: picking a look is seeing it. */
export function LookGrid({ target }: { target: Target }) {
  const { card, isLoading, error, revalidate } = useCard(target);
  const [options, setOptions] = useCardOptions();
  const [selected, setSelected] = useState(defaultLook(environment.appearance));
  const profile = target.kind === "profile";
  return (
    <Grid
      onSelectionChange={(id) => id && setSelected(id)}
      isLoading={isLoading}
      columns={3}
      aspectRatio={profile ? "3/4" : "3/2"}
      fit={Grid.Fit.Contain}
      navigationTitle={targetTitle(card?.target ?? target)}
      searchBarPlaceholder="Filter looks"
      selectedItemId={defaultLook(environment.appearance)}
    >
      {!card ? (
        <Grid.EmptyView
          icon={error ? Icon.Warning : Icon.Hourglass}
          title={error ? `Could not read ${targetTitle(target)}` : `Reading ${targetTitle(target)}…`}
          description={error?.message ?? "Its cards are drawn here once GitHub answers."}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        lookGroups().map((group) => (
          <Grid.Section key={group.title} title={group.title}>
            {group.looks.map((look) => (
              <Grid.Item
                key={look}
                id={look}
                content={{ source: cardFile(card, look, options, !profile) }}
                // The full card is drawn for the selected look alone: 25 of them on every render filled the support folder.
                quickLook={
                  look === selected ? { path: cardFile(card, look, options), name: exportName(card, look) } : undefined
                }
                title={lookTitle(look)}
                subtitle={seasonNote(look) ?? undefined}
                keywords={[look, group.title]}
                actions={
                  <CardActions
                    card={card}
                    look={look}
                    options={options}
                    setOptions={setOptions}
                    onRefresh={revalidate}
                    show={<CardPreview target={card.target} look={look} />}
                  />
                }
              />
            ))}
          </Grid.Section>
        ))
      )}
    </Grid>
  );
}

/** One card at full width, in one look; ⌘T turns it to its other side. */
export function CardPreview({ target, look: first }: { target: Target; look: string }) {
  const [look, setLook] = useState(first);
  const [options, setOptions] = useCardOptions();
  // Its own read of the card, kept or fresh, so Read Again redraws this view and not only the Grid behind it.
  const { card, isLoading, revalidate: onRefresh } = useCard(target);
  if (!card) return <Detail isLoading={isLoading} markdown="" />;
  const file = cardFile(card, look, options);
  const title = targetTitle(card.target);
  return (
    <Detail
      navigationTitle={`${title} · ${lookTitle(look)}`}
      markdown={`![${title} in ${lookTitle(look)}](${pathToFileURL(file).href})`}
      actions={
        <CardActions
          card={card}
          look={look}
          options={options}
          setOptions={setOptions}
          onRefresh={onRefresh}
          onSide={setLook}
        />
      }
    />
  );
}

interface CardActionsProps {
  card: Card;
  look: string;
  options: CardOptions;
  setOptions: (options: CardOptions) => void;
  onRefresh: () => void;
  /** The preview to push: set in the Grid, absent in the preview itself. */
  show?: ReactElement;
  /** Turns the preview to another look: set in the preview only. */
  onSide?: (look: string) => void;
}

function CardActions({ card, look, options, setOptions, onRefresh, show, onSide }: CardActionsProps) {
  const repo = card.target.kind === "repo";
  const side = otherSide(look);
  // The full card is drawn only when an action needs it, not for every look of the Grid.
  const svg = () => readFileSync(cardFile(card, look, options), "utf8");
  const toggle = (section: string) => {
    const on = options.sections.includes(section);
    const sections = REPO_SECTIONS.filter((s) => (s === section ? !on : options.sections.includes(s)));
    if (!sections.length) return showToast({ style: Toast.Style.Failure, title: "A card needs one section at least" });
    setOptions({ ...options, sections });
  };
  // What the setup takes from this card: the card itself, its look and how it is drawn.
  const request: SetupRequest = {
    profile: card.target.kind === "profile",
    repo: card.target.kind === "repo" ? card.target.full : undefined,
    choice: { ...choiceFor(look), calendar: options.calendar, stars: options.starsChart },
    sections: repo ? options.sections : undefined,
  };
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {show ? <Action.Push title="Show Card" icon={Icon.Eye} target={show} /> : null}
        {show ? <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} /> : null}
        {onSide ? (
          <Action
            title="Quick Look"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onAction={() => quickLook(exportFile(card, look, options))}
          />
        ) : null}
        {onSide ? (
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={async () =>
              open(exportFile(card, look, options), await getDefaultApplication("https://github.com"))
            }
          />
        ) : null}
        {card.mine ? (
          <Action.Push title="Use on GitHub" icon={Icon.Upload} target={<UseOnGitHub request={request} />} />
        ) : repo ? (
          <Action.Push
            title="Add to My Glancecard Workflow"
            icon={Icon.PlusCircle}
            target={<UseOnGitHub request={request} />}
          />
        ) : null}
        {onSide && side ? (
          <Action
            title={`Show ${lookTitle(side)}`}
            icon={Icon.CircleProgress50}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => onSide(side)}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy SVG"
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={async () => {
            await Clipboard.copy(svg());
            await showHUD("Copied the SVG");
          }}
        />
        <Action
          title="Copy SVG File"
          icon={Icon.Document}
          shortcut={Keyboard.Shortcut.Common.CopyName}
          onAction={async () => {
            await Clipboard.copy({ file: exportFile(card, look, options) });
            await showHUD(`Copied ${exportName(card, look)}`);
          }}
        />
        <Action
          title="Save to Downloads"
          icon={Icon.Download}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={async () => {
            const file = freeName(path.join(homedir(), "Downloads", exportName(card, look)));
            copyFileSync(cardFile(card, look, options), file);
            await showInFinder(file);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Drawing">
        <ActionPanel.Submenu title="Year" icon={Icon.Calendar} shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}>
          {[
            ["chart", "A Line of Daily Counts"],
            ["grid", "GitHub's Calendar"],
          ].map(([value, title]) => (
            <Action
              key={value}
              title={title}
              icon={options.calendar === value ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setOptions({ ...options, calendar: value })}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Stars" icon={Icon.Star} shortcut={Keyboard.Shortcut.Common.Duplicate}>
          {STARS.map((value) => (
            <Action
              key={value}
              title={lookTitle(value)}
              icon={options.starsChart === value ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setOptions({ ...options, starsChart: value })}
            />
          ))}
        </ActionPanel.Submenu>
        {repo ? (
          <ActionPanel.Submenu
            title="Sections"
            icon={Icon.AppWindowList}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          >
            {REPO_SECTIONS.map((section) => (
              <Action
                key={section}
                title={lookTitle(section)}
                icon={options.sections.includes(section) ? Icon.CheckCircle : Icon.Circle}
                onAction={() => toggle(section)}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open on GitHub" url={targetUrl(card.target)} />
        <Action.OpenInBrowser
          title="Open Glancecard Website"
          icon={Icon.Globe}
          url="https://gfazioli.github.io/glancecard/"
        />
        <Action
          title="Read Again from GitHub"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * The system's Quick Look panel on a file, as the space bar opens it in Finder: Raycast's own
 * Quick Look belongs to List and Grid items, and the preview is a Detail.
 */
function quickLook(file: string) {
  spawn("qlmanage", ["-p", file], { detached: true, stdio: "ignore" }).unref();
}

/** `file`, or `file` with " 2", " 3"… before its extension when it is taken: a save never overwrites. */
function freeName(file: string): string {
  const { dir, name, ext } = path.parse(file);
  let candidate = file;
  for (let n = 2; existsSync(candidate); n++) candidate = path.join(dir, `${name} ${n}${ext}`);
  return candidate;
}
