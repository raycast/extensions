/**
 * Manage Taps: every third-party tap as a section, holding its packages as the
 * same rows Search renders. Add, trust, untrust and remove taps from any row.
 *
 * Adding a tap is a trust decision, and Homebrew 7 owns it (`brew trust`). The
 * command puts a deliberate confirmation in front of it rather than inventing a
 * consent model of its own. Typing or pasting a tap into the search bar — or
 * passing one as the command's argument — offers to add it.
 *
 * Action order follows the tree, nearest object first: the package's own
 * actions, then its tap's section, then View.
 */

import { useState } from "react";
import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { getProgressIcon, useCachedState } from "@raycast/utils";
import {
  brewFetchInstalled,
  brewIdentifier,
  brewName,
  brewTapCommand,
  confirmAndRun,
  contentsOfTap,
  contentsText,
  formatCount,
  HOMEBREW_7,
  InstalledMap,
  isEmptyTap,
  parseTapName,
  tapCommandName,
  untapSteps,
  shortUrl,
  type Cask,
  type Formula,
  type Tap,
  type TapInstalls,
  type TapStatus,
} from "./utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { InstallFromTapAction } from "./components/actions";
import { CaskListItem, FormulaListItem } from "./components/list";
import { RefreshAction, ToggleSidebarAction } from "./components/actionPanels";
import { STATUS_COLOR, WARNING_ICON } from "./components/palette";
import { TapAddSection } from "./components/tapAdd";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { useBrewMajorVersion } from "./hooks/useBrewMajorVersion";
import { isInstalled } from "./hooks/useBrewSearch";
import { useBrewTaps } from "./hooks/useBrewTaps";
import { useTapPreflight } from "./hooks/useTapPreflight";

const ALL_TAPS = "all";

/** "3 formulae, 2 casks" — what a tap provides, leaving out a kind it has none of. */
const provides = (tap: Tap) => contentsText(contentsOfTap(tap));

function commandNames(tap: Tap): string[] {
  return (tap.command_files ?? []).map(tapCommandName);
}

/** The web page for a tap's remote, when it is one. `updatest/tap` is a `.git` URL. */
function repositoryUrl(tap: Tap): string | undefined {
  return tap.remote?.startsWith("https://") ? `https://${shortUrl(tap.remote)}` : undefined;
}

/**
 * What the tap provides, its trust, and how many of its packages brew could not
 * load — so a section showing fewer rows than it claims says why.
 */
function sectionSubtitle(tap: TapStatus, trustSupported: boolean, unavailable: string[]): string {
  const broken = unavailable.filter((name) => name.startsWith(`${tap.name}/`)).length;
  return [
    provides(tap),
    trustSupported && tap.trusted !== undefined ? (tap.trusted ? "Trusted" : "Not Trusted") : undefined,
    broken > 0 ? `${broken} Won't Load` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The row mark, for exceptions only: a package trusted on its own in a tap that
 * is not. Every other row's trust is its tap's, which the section subtitle says
 * once rather than on every row.
 */
function trustException(tap: TapStatus, item: Cask | Formula): List.Item.Accessory | undefined {
  if (tap.trusted !== false || !tap.trustedPackages.includes(brewIdentifier(item))) return undefined;
  return {
    icon: { source: Icon.CheckRosette, tintColor: STATUS_COLOR.info },
    tooltip: "Trusted on its own. The tap is not, so packages added to it later will ask first.",
  };
}

/** The sidebar's Trust row. */
function trustRow(tap: TapStatus, item: Cask | Formula, trustSupported: boolean) {
  if (!trustSupported || tap.trusted === undefined) return undefined;
  if (tap.trusted)
    return { text: "Trusted with its tap", icon: { source: Icon.CheckRosette, tintColor: STATUS_COLOR.ok } };
  if (tap.trustedPackages.includes(brewIdentifier(item)))
    return { text: "Trusted on its own", icon: { source: Icon.CheckRosette, tintColor: STATUS_COLOR.info } };
  return { text: "Not trusted", icon: WARNING_ICON };
}

/** Everything installed from this tap, as the qualified names brew prints. */
function installedFrom(tap: Tap, installed: InstalledMap | undefined): TapInstalls | undefined {
  if (!installed) return undefined;
  const from = (items: Iterable<Cask | Formula>) =>
    [...items].filter((item) => item.tap === tap.name).map(brewIdentifier);
  return { formulae: from(installed.formulae.values()), casks: from(installed.casks.values()) };
}

async function trustTap(tap: Tap, onDone: () => void) {
  // Trust covers whatever the tap adds later, so trusting an empty one is
  // trusting only what its owner pushes next. Say so before it happens.
  const empty = isEmptyTap(contentsOfTap(tap));
  const ok = await confirmAndRun([brewTapCommand("trust", "--tap", tap.name)], {
    title: empty ? "Trust a Tap with No Packages?" : `Trust ${tap.name}?`,
    showCommands: false,
    confirmTitle: empty ? "Proceed" : "Trust",
    message: empty
      ? `You're about to trust ${tap.name}, which has no packages. Homebrew will run anything ${tap.user} adds to it later.`
      : `Maintained by ${tap.user}, not Homebrew. Trusting it lets Homebrew run anything it provides (${provides(tap).toLowerCase()}), now or later.`,
    labels: {
      progress: `Trusting ${tap.name}`,
      success: `Trusted ${tap.name}`,
      failure: `Failed to trust ${tap.name}`,
    },
  });
  if (ok) onDone();
}

async function untrustTap(
  tap: Tap,
  loaded: InstalledMap | undefined,
  onBusy: (busy: boolean) => void,
  onDone: () => void,
) {
  // Homebrew stops listing an installed formula from an untrusted tap
  // (`brew info --installed` skips it), so it would drop out of Installed with
  // no word. `untrust --tap` also clears the tap's individually trusted
  // packages, so every installed formula from it is affected. Name them first.
  // The list may not have loaded yet (or failed to): read it now rather than
  // show a warning with nothing in it. The wait shows as the list's loading
  // bar, not a toast: a toast has no id, so hiding ours could dismiss another
  // action's toast shown meanwhile.
  let map = loaded;
  if (!map) {
    onBusy(true);
    try {
      map = await brewFetchInstalled(true).catch(() => undefined);
    } finally {
      onBusy(false);
    }
  }
  const formulae = installedFrom(tap, map)?.formulae;
  const hidden = !formulae
    ? "\n\nCouldn't check which installed formulae come from this tap. Any that do stay installed, but won't appear in Show Installed or Show Upgrades."
    : formulae.length > 0
      ? `\n\nThese formulae stay installed, but won't appear in Show Installed or Show Upgrades:\n${formulae.join("\n")}`
      : "";
  const ok = await confirmAndRun([brewTapCommand("untrust", "--tap", tap.name)], {
    title: `Stop Trusting ${tap.name}?`,
    showCommands: false,
    confirmTitle: "Stop Trusting",
    message: `Homebrew won't load this tap's packages until you trust them again.${hidden}`,
    labels: {
      progress: `Untrusting ${tap.name}`,
      success: `Stopped trusting ${tap.name}`,
      failure: `Failed to stop trusting ${tap.name}`,
    },
  });
  if (ok) onDone();
}

async function untap(tap: Tap, installed: TapInstalls | undefined, onDone: () => void) {
  // Unknown (the installed list has not loaded) runs a plain untap: brew itself
  // refuses while packages from the tap are installed, so nothing is lost.
  const known = installed ?? { formulae: [], casks: [] };
  const uninstalls = [...known.casks, ...known.formulae];
  const uninstallFirst = uninstalls.length > 0;
  // Refresh after any attempt, not only a complete one: when the casks are
  // uninstalled and a formula then fails, a stale list would make a retry try
  // to uninstall the casks again, fail there, and never reach the formula.
  let started = false;
  // Homebrew 7 reports `trusted`; trust there is reset along with the tap, so
  // adding it again later asks again instead of trusting it silently.
  const untrust = tap.trusted !== undefined;
  const steps = untapSteps(tap.name, known, { untrust });
  await confirmAndRun(
    steps.map((step) => step.command),
    {
      beforeRun: async () => (started = true),
      title: uninstallFirst
        ? `Uninstall ${formatCount(uninstalls.length, "Package")} and Remove ${tap.name}?`
        : `Remove ${tap.name}?`,
      message: uninstallFirst
        ? `Homebrew will not remove a tap while packages from it are installed, so these are uninstalled first:\n${uninstalls.join("\n")}${untrust ? "\n\nIts trust setting is reset too." : ""}`
        : untrust
          ? "Remove the local copy of this tap with its packages and reset its trust setting."
          : "Remove the local copy of this tap with its packages.",
      showCommands: false,
      stepNoun: "step",
      stepLabels: steps.map((step) => step.label),
      confirmTitle: uninstallFirst ? "Uninstall and Remove" : "Remove",
      labels: {
        progress: `Removing ${tap.name}`,
        success: `Removed ${tap.name}`,
        failure: `Failed to remove ${tap.name}`,
      },
    },
  );
  if (started) onDone();
}

/**
 * The tap's own actions, appended to every row in its section. No shortcuts:
 * a package panel already binds Open (⌘O) and Remove (⌃X) to the package.
 * `copyName` is off for a cask row, whose panel already has Copy Tap Name.
 */
function TapSection(props: {
  tap: TapStatus;
  installed: InstalledMap | undefined;
  trustSupported: boolean;
  copyName: boolean;
  onBusy: (busy: boolean) => void;
  onChange: () => void;
}) {
  const { tap, onChange } = props;
  const url = repositoryUrl(tap);
  const canTrust = props.trustSupported && !tap.official && tap.trusted !== undefined;
  return (
    <ActionPanel.Section title={tap.name}>
      {canTrust && !tap.trusted && (
        <Action title="Trust Tap" icon={Icon.CheckRosette} onAction={() => trustTap(tap, onChange)} />
      )}
      {canTrust && tap.trusted && (
        <Action
          title="Stop Trusting Tap"
          icon={Icon.XMarkCircle}
          onAction={() => untrustTap(tap, props.installed, props.onBusy, onChange)}
        />
      )}
      {url && <Action.OpenInBrowser title="Open Repository" url={url} />}
      {props.copyName && <Action.CopyToClipboard title="Copy Tap Name" content={tap.name} />}
      {!tap.official && (
        <Action
          title="Remove Tap"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => untap(tap, installedFrom(tap, props.installed), onChange)}
        />
      )}
    </ActionPanel.Section>
  );
}

/**
 * A package Homebrew won't read until it or its tap is trusted: from Homebrew
 * 7.0.14, `brew info` refuses it, so there is no record to show, only the name
 * and kind `tap-info` lists. Install confirms first and trusts this package
 * only, as installing from Search does; Trust Tap is in the tap's section.
 */
function UntrustedItem(props: {
  tap: TapStatus;
  fullName: string;
  cask: boolean;
  installed: InstalledMap | undefined;
  trustSupported: boolean;
  showMetadataPanel: boolean;
  onToggleSidebar: () => void;
  onBusy: (busy: boolean) => void;
  onChange: () => void;
}) {
  const { tap, fullName, cask } = props;
  const name = fullName.split("/").pop() ?? fullName;
  const kind = cask ? "cask" : "formula";
  return (
    <List.Item
      id={`untrusted:${kind}:${fullName}`}
      title={name}
      icon={WARNING_ICON}
      accessories={[{ tag: { value: "Not Trusted", color: STATUS_COLOR.attention } }]}
      detail={
        <List.Item.Detail
          markdown={`**${name}** is a ${kind} from **${tap.name}**, maintained by ${tap.user}, not Homebrew.\n\nHomebrew won't read its details until it is trusted. Installing it trusts this ${kind} only; Trust Tap trusts everything the tap adds, now or later.`}
        />
      }
      actions={
        <ActionPanel>
          <InstallFromTapAction
            target={{ tap: tap.name, package: fullName, ...(cask ? { cask: true as const } : {}) }}
            // Refreshed after any attempt: trust may have changed even when the
            // install then failed, and the row must not keep saying Not Trusted.
            onAction={() => props.onChange()}
          />
          <TapSection
            tap={tap}
            installed={props.installed}
            trustSupported={props.trustSupported}
            copyName
            onBusy={props.onBusy}
            onChange={props.onChange}
          />
          <ActionPanel.Section title="View">
            <ToggleSidebarAction showing={props.showMetadataPanel} onToggleSidebar={props.onToggleSidebar} />
            <RefreshAction onRefresh={props.onChange} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/**
 * A tap with no formulae or casks only adds brew commands, so it gets one row
 * naming them. Its primary action opens the repository: a stray ↵ must never
 * change trust.
 */
function CommandsItem(props: {
  tap: TapStatus;
  installed: InstalledMap | undefined;
  trustSupported: boolean;
  showMetadataPanel: boolean;
  onToggleSidebar: () => void;
  onBusy: (busy: boolean) => void;
  onChange: () => void;
}) {
  const { tap } = props;
  const commands = commandNames(tap);
  const url = repositoryUrl(tap);
  const trusted =
    props.trustSupported && tap.trusted !== undefined ? (tap.trusted ? "Trusted" : "Not trusted") : undefined;
  return (
    <List.Item
      id={`commands:${tap.name}`}
      title={commands.length > 0 ? "No formulae or casks" : "No packages found"}
      subtitle={props.showMetadataPanel ? undefined : commands.length > 0 ? `Adds ${commands.join(", ")}` : undefined}
      icon={commands.length > 0 ? Icon.Terminal : Icon.Box}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title={tap.name}
                text={
                  commands.length > 0
                    ? "Adds brew commands and no formulae or casks"
                    : "Holds no formulae, casks or commands. Remove it if you don't need it."
                }
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Commands">
                {commands.map((command) => (
                  <List.Item.Detail.Metadata.TagList.Item key={command} text={command} />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {trusted && <List.Item.Detail.Metadata.Label title="Trust" text={trusted} />}
              {tap.remote && <List.Item.Detail.Metadata.Label title="Source" text={shortUrl(tap.remote)} />}
              {tap.last_commit && <List.Item.Detail.Metadata.Label title="Last Commit" text={tap.last_commit} />}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {url && (
            <ActionPanel.Section>
              <Action.OpenInBrowser title="Open Repository" url={url} />
            </ActionPanel.Section>
          )}
          {commands.length > 0 && (
            <ActionPanel.Section title="Commands">
              {commands.map((command) => (
                <Action.CopyToClipboard key={command} title={`Copy "${command}"`} content={command} />
              ))}
            </ActionPanel.Section>
          )}
          <TapSection
            tap={tap}
            installed={props.installed}
            trustSupported={props.trustSupported}
            copyName
            onBusy={props.onBusy}
            onChange={props.onChange}
          />
          <ActionPanel.Section title="View">
            <ToggleSidebarAction showing={props.showMetadataPanel} onToggleSidebar={props.onToggleSidebar} />
            <RefreshAction onRefresh={props.onChange} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function matches(item: Cask | Formula, query: string): boolean {
  return [brewName(item), brewIdentifier(item), item.desc ?? ""].join(" ").toLowerCase().includes(query);
}

function ManageTapsContent(props: { initialTap?: string }) {
  const [searchText, setSearchText] = useState(props.initialTap ?? "");
  const [tapFilter, setTapFilter] = useState(ALL_TAPS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMetadataPanel, setShowMetadataPanel] = useCachedState("show-sidebar-taps", false);
  // The add rows open with the sidebar, since what the check found is their
  // point; their own toggle hides it. Separate from the package rows' toggle.
  const [showAddPanel, setShowAddPanel] = useCachedState("show-add-panel", true);
  const [showDescription, setShowDescription] = useCachedState("show-description", true);
  const { isLoading, data, revalidate } = useBrewTaps();
  // Set while Stop Trusting Tap reads the installed list itself.
  const [checking, setChecking] = useState(false);
  const { data: installed, revalidate: revalidateInstalled } = useBrewInstalled();
  const { major } = useBrewMajorVersion();
  const trustSupported = major !== undefined && major >= HOMEBREW_7;

  const onChange = () => {
    revalidate();
    revalidateInstalled();
  };
  const onToggleSidebar = () => setShowMetadataPanel((current) => !current);

  const taps = data?.taps ?? [];
  const target = parseTapName(searchText);
  const known = target && taps.find((tap) => tap.name === target.tap);
  const offerAdd = target !== undefined && !known && data !== undefined;
  const query = target ? "" : searchText.trim().toLowerCase();
  const { preflight, recheck } = useTapPreflight(offerAdd ? target : undefined, searchText);

  // A typed tap narrows to that tap (or offers to add it); anything else
  // searches package names and descriptions, and a tap-name hit keeps the
  // whole section.
  const sections = offerAdd
    ? []
    : taps
        .filter((tap) => (known ? tap === known : tapFilter === ALL_TAPS || tap.name === tapFilter))
        .map((tap) => {
          const tapHit = query === "" || tap.name.includes(query);
          const keep = <T extends Cask | Formula>(items: T[]) =>
            items.filter((item) => item.tap === tap.name && (tapHit || matches(item, query)));
          // Names only: these have no record (see `UntrustedItem`).
          const keepNames = (names: string[] | undefined) =>
            (names ?? []).filter((n) => n.startsWith(`${tap.name}/`) && (tapHit || n.toLowerCase().includes(query)));
          return {
            tap,
            formulae: keep(data?.packages.formulae ?? []),
            casks: keep(data?.packages.casks ?? []),
            untrustedFormulae: keepNames(data?.packages.untrusted?.formulae),
            untrustedCasks: keepNames(data?.packages.untrusted?.casks),
            commandsOnly: tap.formula_names.length === 0 && tap.cask_tokens.length === 0,
            tapHit,
          };
        })
        .filter(
          (s) =>
            s.formulae.length > 0 ||
            s.casks.length > 0 ||
            s.untrustedFormulae.length > 0 ||
            s.untrustedCasks.length > 0 ||
            (s.commandsOnly && s.tapHit),
        );

  const rowProps = {
    selectedId,
    isInstalled: (name: string) => isInstalled(name, installed),
    onAction: onChange,
    showMetadataPanel,
    onToggleSidebar,
    showDescription,
    onToggleDescription: () => setShowDescription((current) => !current),
  };
  const tapSectionProps = { installed, trustSupported, onBusy: setChecking, onChange };

  return (
    <List
      isLoading={isLoading || checking}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      filtering={false}
      isShowingDetail={offerAdd && preflight !== undefined ? showAddPanel : showMetadataPanel}
      searchBarPlaceholder="Search packages and taps, or type user/repo to add…"
      searchBarAccessory={
        <List.Dropdown tooltip="Tap" value={tapFilter} onChange={setTapFilter}>
          <List.Dropdown.Item title="All Taps" value={ALL_TAPS} />
          <List.Dropdown.Section title="Taps">
            {taps.map((tap) => (
              <List.Dropdown.Item key={tap.name} title={tap.name} value={tap.name} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {isLoading && !data ? (
        <List.EmptyView icon={getProgressIcon(0.5)} title="Loading taps…" description="Running brew tap-info" />
      ) : taps.length === 0 && !offerAdd ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="No Third-Party Taps"
          description="To add one, type it as user/repo or paste its install command."
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Packages or Taps"
          description="To add a tap, type it as user/repo or paste its install command."
        />
      )}

      {offerAdd && target && preflight && (
        <TapAddSection
          target={target}
          preflight={preflight}
          knownTaps={taps.map((tap) => tap.name)}
          trustSupported={trustSupported}
          onAdded={(tap) => {
            setSearchText(tap);
            onChange();
          }}
          onInstalled={onChange}
          installed={installed}
          isInstalled={rowProps.isInstalled}
          showDetail={showAddPanel}
          viewActions={
            <ActionPanel.Section title="View">
              <ToggleSidebarAction
                showing={showAddPanel}
                onToggleSidebar={() => setShowAddPanel((current) => !current)}
              />
              <RefreshAction
                onRefresh={() => {
                  onChange();
                  recheck();
                }}
              />
            </ActionPanel.Section>
          }
        />
      )}

      {sections.map(({ tap, formulae, casks, untrustedFormulae, untrustedCasks, commandsOnly }) => (
        <List.Section
          key={tap.name}
          title={tap.name}
          subtitle={sectionSubtitle(tap, trustSupported, data?.packages.unavailable ?? [])}
        >
          {formulae.map((formula) => (
            <FormulaListItem
              key={`formula:${brewIdentifier(formula)}`}
              id={`formula:${brewIdentifier(formula)}`}
              formula={formula}
              {...rowProps}
              extraAccessory={trustException(tap, formula)}
              trust={trustRow(tap, formula, trustSupported)}
              extraActions={<TapSection tap={tap} copyName {...tapSectionProps} />}
            />
          ))}
          {casks.map((cask) => (
            <CaskListItem
              key={`cask:${brewIdentifier(cask)}`}
              id={`cask:${brewIdentifier(cask)}`}
              cask={cask}
              {...rowProps}
              extraAccessory={trustException(tap, cask)}
              trust={trustRow(tap, cask, trustSupported)}
              extraActions={<TapSection tap={tap} copyName={false} {...tapSectionProps} />}
            />
          ))}
          {[...untrustedFormulae.map((n) => [n, false] as const), ...untrustedCasks.map((n) => [n, true] as const)].map(
            ([fullName, cask]) => (
              <UntrustedItem
                key={`untrusted:${cask ? "cask" : "formula"}:${fullName}`}
                tap={tap}
                fullName={fullName}
                cask={cask}
                showMetadataPanel={showMetadataPanel}
                onToggleSidebar={onToggleSidebar}
                {...tapSectionProps}
              />
            ),
          )}
          {commandsOnly && (
            <CommandsItem
              tap={tap}
              showMetadataPanel={showMetadataPanel}
              onToggleSidebar={onToggleSidebar}
              {...tapSectionProps}
            />
          )}
        </List.Section>
      ))}
    </List>
  );
}

export default function Main(props: LaunchProps<{ arguments: Arguments.ManageTaps }>) {
  return (
    <ErrorBoundary>
      <ManageTapsContent initialTap={props.arguments.tap?.trim() || undefined} />
    </ErrorBoundary>
  );
}
