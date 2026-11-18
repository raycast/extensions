/**
 * The "Add" section Manage Taps shows for a tap that is not added yet, driven
 * by the preflight (`useTapPreflight`): what the repository holds, and, when it
 * is not a tap, what the user most likely meant. One confirmation per path,
 * because trust is the decision that matters and it is made exactly once:
 * Install trusts one package, Add Tap the whole tap, Add Anyway nothing.
 */

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import {
  addTap,
  brewIdentifier,
  codeBlock,
  cloneUrl,
  closestPackages,
  contentsText,
  formatCount,
  installTargetFor,
  packageNameOf,
  shortUrl,
  tapOwner,
  type Cask,
  type Formula,
  type InstalledMap,
  type Preflight,
  type TapContents,
  type TapLead,
  type TapTarget,
} from "../utils";

/** Where a tap is cloned from, as a person would read it. */
const tapSource = (target: TapTarget) => shortUrl(cloneUrl(target));
import { InstallFromTapAction } from "./actions";
import { CaskInfo } from "./caskInfo";
import { FormulaInfo } from "./formulaInfo";
import { STATUS_COLOR, UP_TO_DATE_ICON, WARNING_ICON } from "./palette";

const packageName = (target: TapTarget) => packageNameOf(target) ?? "";

/** Whether a lead's kind is settled: `--cask` was given, or the tap has a formula by that name. */
const leadKindKnown = (lead: TapLead) =>
  lead.target.cask === true || lead.contents.formulae.includes(packageName(lead.target));

/** The Add Tap path: trusts the whole tap, so the alert names what it holds when that is known. */
function addAndTrust(
  target: TapTarget,
  contents: TapContents | undefined,
  trustSupported: boolean,
  onDone: () => void,
) {
  const user = tapOwner(target.tap);
  const holds = contents ? ` (${contentsText(contents).toLowerCase()})` : "";
  return addTap(
    target,
    {
      trust: trustSupported,
      title: `Add ${target.tap}?`,
      confirmTitle: "Add Tap",
      message: trustSupported
        ? `Maintained by ${user}, not Homebrew. Adding also trusts it, which lets Homebrew run anything it provides${holds}, now or later.`
        : `Maintained by ${user}, not Homebrew. Adding it lets Homebrew install anything it provides${holds}.`,
    },
    onDone,
  );
}

/** The Add Anyway path: the preflight found nothing, so nothing is trusted. */
function addAnyway(target: TapTarget, notFound: boolean, onDone: () => void) {
  return addTap(
    target,
    {
      trust: false,
      title: `Add ${target.tap} Anyway?`,
      confirmTitle: "Add Anyway",
      message: notFound
        ? "The check found no repository there. If it's private and git can't sign in to it yet, adding it may still work. It will be added but not trusted."
        : "Brew found no packages in this repository. It will be added but not trusted, and you can remove it from Manage Taps.",
    },
    onDone,
  );
}

/** The README line a lead came from, as the user would have read it. */
function readmeCommand(lead: TapLead): string {
  const t = lead.target;
  const tap = `brew tap ${t.tap}${t.url ? ` ${t.url}` : ""}`;
  if (!t.package) return tap;
  const install = `brew install ${t.cask ? "--cask " : ""}${t.package}`;
  // A tap from a custom remote has to be added from that remote first; an
  // install alone would make brew clone the default GitHub location.
  return t.url ? `${tap}\n${install}` : install;
}

function ContentsTags(props: { contents: TapContents }) {
  const { contents } = props;
  return (
    <>
      {contents.formulae.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Formulae">
          {contents.formulae.map((name) => (
            <List.Item.Detail.Metadata.TagList.Item key={name} text={name} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {contents.casks.length > 0 && (
        <List.Item.Detail.Metadata.TagList title="Casks">
          {contents.casks.map((name) => (
            <List.Item.Detail.Metadata.TagList.Item key={name} text={name} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      )}
      {contents.commands.length > 0 && (
        <List.Item.Detail.Metadata.Label title="Commands" text={formatCount(contents.commands.length, "command")} />
      )}
    </>
  );
}

/** What the preflight found, shared by every row in the section. */
function PreflightDetail(props: { target: TapTarget; preflight: Preflight | "checking" }) {
  const { target, preflight } = props;
  const owner = tapOwner(target.tap);
  if (preflight === "checking") {
    return (
      <List.Item.Detail
        markdown={`Reading the file list of **${tapSource(target)}**. Nothing is added or installed.`}
      />
    );
  }
  switch (preflight.kind) {
    case "tap":
      return (
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Tap" text={target.tap} />
              <List.Item.Detail.Metadata.Label title="Maintained By" text={owner} />
              <List.Item.Detail.Metadata.Label title="Source" text={tapSource(target)} />
              <List.Item.Detail.Metadata.Separator />
              <ContentsTags contents={preflight.contents} />
            </List.Item.Detail.Metadata>
          }
        />
      );
    case "missing-package":
      return (
        <List.Item.Detail
          markdown={`**${target.tap}** has no package named **${preflight.package}**.`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Tap" text={target.tap} />
              <List.Item.Detail.Metadata.Separator />
              <ContentsTags contents={preflight.contents} />
            </List.Item.Detail.Metadata>
          }
        />
      );
    case "not-a-tap": {
      const lead = preflight.lead;
      const intro = `**${preflight.repo}** has no packages where Homebrew looks: no \`Formula/\`, \`Casks/\` or \`.rb\` files at the top.`;
      const found = !lead
        ? "Brew found no tap from the same owner either. The repository's own instructions are the best place to look."
        : lead.source === "readme"
          ? `Its README says to run:\n\n${codeBlock(readmeCommand(lead), "shell")}`
          : `${owner} also publishes **${lead.target.tap}**.`;
      return (
        <List.Item.Detail
          markdown={`${intro}\n\n${found}`}
          metadata={
            lead && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Suggested Tap"
                  text={lead.target.tap}
                  icon={lead.differentOwner ? WARNING_ICON : undefined}
                />
                {lead.differentOwner && (
                  <List.Item.Detail.Metadata.Label
                    title="Different Owner"
                    text={`${tapOwner(lead.target.tap)}, not ${owner}`}
                    icon={WARNING_ICON}
                  />
                )}
                {lead.target.package && (
                  <List.Item.Detail.Metadata.Label title="Package" text={packageName(lead.target)} />
                )}
                <List.Item.Detail.Metadata.Separator />
                <ContentsTags contents={lead.contents} />
              </List.Item.Detail.Metadata>
            )
          }
        />
      );
    }
    case "not-found": {
      // `user/name` means the tap at `user/homebrew-name`, which is where brew
      // would clone from; say so, since the typed text never mentions it.
      const where = `Homebrew looks for the tap **${target.tap}** at **${preflight.repo}**, and there's no repository there that git can read. It may be misspelled, or private.`;
      const lead = preflight.lead;
      return (
        <List.Item.Detail
          markdown={
            lead ? `${where}\n\n**${lead.target.tap}** has a package named **${packageName(lead.target)}**.` : where
          }
          metadata={
            lead && (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Suggested Tap" text={lead.target.tap} />
                <List.Item.Detail.Metadata.Label title="Package" text={packageName(lead.target)} />
                <List.Item.Detail.Metadata.Separator />
                <ContentsTags contents={lead.contents} />
              </List.Item.Detail.Metadata>
            )
          }
        />
      );
    }
    case "unchecked":
      return (
        <List.Item.Detail
          markdown={`Brew couldn't look inside **${tapSource(target)}**: ${preflight.reason}. Brew will check what the tap holds after adding it.`}
        />
      );
  }
}

/**
 * The rows for a tap that is not added yet. `knownTaps` is what is already
 * added here: a lead to one of those needs no Add row, and its install skips
 * the clone.
 */
export function TapAddSection(props: {
  target: TapTarget;
  preflight: Preflight | "checking";
  knownTaps: string[];
  trustSupported: boolean;
  onAdded: (tap: string) => void;
  onInstalled: () => void;
  /** What brew has installed, so a lead already installed opens instead of offering Install. */
  installed: InstalledMap | undefined;
  isInstalled: (name: string) => boolean;
  /** The sidebar is open: it says what a subtitle would, and a subtitle there truncates the title. */
  showDetail: boolean;
  viewActions: ActionPanel.Children;
}) {
  const { target, preflight, trustSupported, viewActions } = props;
  const sub = (text: string) => (props.showDetail ? undefined : text);
  const detail = <PreflightDetail target={target} preflight={preflight} />;

  /** The installed package this name means, through formula aliases and old names. */
  const installedAs = (tap: string, name: string, cask: boolean, kindKnown: boolean): Cask | Formula | undefined => {
    const fromTap = <T extends Cask | Formula>(items: Iterable<T> | undefined) =>
      [...(items ?? [])].filter((item) => item.tap === tap);
    const formula = cask
      ? undefined
      : fromTap(props.installed?.formulae.values()).find(
          (item) =>
            brewIdentifier(item) === `${tap}/${name}` || item.aliases?.includes(name) || item.oldnames?.includes(name),
        );
    if (formula) return formula;
    if (!cask && kindKnown) return undefined;
    return fromTap(props.installed?.casks.values()).find((item) => brewIdentifier(item) === `${tap}/${name}`);
  };

  const addRow = (tap: TapTarget, contents: TapContents | undefined, subtitle: string, id = "add") => (
    <List.Item
      key={id}
      id={id}
      title={`Add ${tap.tap}`}
      subtitle={sub(subtitle)}
      icon={Icon.Plus}
      detail={detail}
      actions={
        <ActionPanel>
          <Action
            title="Add Tap"
            icon={Icon.Plus}
            onAction={() => addAndTrust(tap, contents, trustSupported, () => props.onAdded(tap.tap))}
          />
          {viewActions}
        </ActionPanel>
      }
    />
  );

  /**
   * `kindKnown` is false only for a lead named without `--cask` whose tap has
   * no formula by that name: brew then installs the cask, so an installed cask
   * counts. A formula by that name is what brew installs, so it never does.
   */
  const installRow = (tap: TapTarget, name: string, cask: boolean, subtitle: string, kindKnown = true) => {
    const installTarget = installTargetFor(tap, name, cask);
    // A tap can ship a formula and a cask under one name; they are two rows.
    const id = `install:${cask ? "cask" : "formula"}:${installTarget.package}`;
    const owned = installedAs(tap.tap, name, cask, kindKnown);
    if (owned) {
      // Installing again would do nothing; open the package as Search would.
      return (
        <List.Item
          key={id}
          id={id}
          title={`Show ${name}`}
          subtitle={sub(`installed from ${tap.tap}`)}
          icon={UP_TO_DATE_ICON}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.Document}
                target={
                  "token" in owned ? (
                    <CaskInfo cask={owned} isInstalled={props.isInstalled} onAction={props.onInstalled} />
                  ) : (
                    <FormulaInfo formula={owned} isInstalled={props.isInstalled} onAction={props.onInstalled} />
                  )
                }
              />
              <Action title="Show Tap" icon={Icon.Eye} onAction={() => props.onAdded(tap.tap)} />
              {viewActions}
            </ActionPanel>
          }
        />
      );
    }
    return (
      <List.Item
        key={id}
        id={id}
        title={`Install ${name}`}
        subtitle={sub(cask ? `cask ${subtitle}` : subtitle)}
        icon={{ source: Icon.Download, tintColor: STATUS_COLOR.info }}
        detail={detail}
        actions={
          <ActionPanel>
            <InstallFromTapAction
              target={installTarget}
              // Installed: this row now offers nothing (the tap is added, the
              // package is in), so move to the tap's own section, where the
              // package shows as installed with its usual actions.
              onAction={(installed) => (installed ? props.onAdded(tap.tap) : props.onInstalled())}
            />
            {viewActions}
          </ActionPanel>
        }
      />
    );
  };

  const anywayRow = (notFound: boolean) => (
    <List.Item
      key="anyway"
      id="anyway"
      // Short, so it fits beside the sidebar; the section title and the alert name the tap.
      title="Add Anyway"
      subtitle={sub(`${target.tap} · ${notFound ? "Misspelled, or private" : "No packages found"}`)}
      icon={WARNING_ICON}
      detail={detail}
      actions={
        <ActionPanel>
          <Action
            title="Add Anyway"
            icon={Icon.Plus}
            onAction={() => addAnyway(target, notFound, () => props.onAdded(target.tap))}
          />
          {viewActions}
        </ActionPanel>
      }
    />
  );

  if (preflight === "checking") {
    return (
      <List.Section title="Add">
        <List.Item
          id="add"
          title={`Checking ${tapSource(target)}`}
          subtitle={sub("Reading its file list. Nothing is added yet.")}
          icon={getProgressIcon(0.5)}
          detail={detail}
          actions={
            <ActionPanel>
              {/* The check is advisory: a fast ↵ still gets today's add. */}
              <Action
                title="Add Tap"
                icon={Icon.Plus}
                onAction={() => addAndTrust(target, undefined, trustSupported, () => props.onAdded(target.tap))}
              />
              {viewActions}
            </ActionPanel>
          }
        />
      </List.Section>
    );
  }

  switch (preflight.kind) {
    case "tap": {
      const { formulae, casks } = preflight.contents;
      // A named package, or the only one there is: nothing to choose, so Install leads.
      const only =
        formulae.length + casks.length === 1
          ? { name: formulae[0] ?? casks[0], cask: formulae.length === 0 }
          : undefined;
      const named = target.package
        ? {
            name: packageName(target),
            // A cask only on evidence: an alias or a renamed formula is in
            // neither list, and `brew info` without --cask resolves both kinds.
            cask:
              target.cask === true || (casks.includes(packageName(target)) && !formulae.includes(packageName(target))),
          }
        : only;
      return (
        <List.Section title="Add">
          {named && installRow(target, named.name, named.cask, `from ${target.tap}`)}
          {addRow(target, preflight.contents, contentsText(preflight.contents))}
        </List.Section>
      );
    }
    case "missing-package":
      return (
        <List.Section title={`${target.tap} Has No ${preflight.package}`}>
          {closestPackages(preflight.contents, preflight.package).map((item) =>
            installRow(target, item.name, item.cask, `from ${target.tap}`),
          )}
          {addRow(target, preflight.contents, contentsText(preflight.contents))}
        </List.Section>
      );
    case "not-a-tap": {
      const lead = preflight.lead;
      const repoName = preflight.repo.split("/").pop();
      const leadAdded = lead !== undefined && props.knownTaps.includes(lead.target.tap);
      const via = lead?.source === "readme" ? " · named in its README" : "";
      return (
        <List.Section title={`${repoName} Isn't a Homebrew Tap`}>
          {lead?.target.package &&
            installRow(
              lead.target,
              packageName(lead.target),
              lead.target.cask === true,
              `from ${lead.target.tap}${leadAdded ? " · already added" : via}`,
              leadKindKnown(lead),
            )}
          {lead && !leadAdded && addRow(lead.target, lead.contents, `${contentsText(lead.contents)}${via}`, "add-lead")}
          {lead && leadAdded && !lead.target.package && (
            <List.Item
              id="show-lead"
              title={`Show ${lead.target.tap}`}
              subtitle={sub(`already added${via}`)}
              icon={Icon.Eye}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action title="Show Tap" icon={Icon.Eye} onAction={() => props.onAdded(lead.target.tap)} />
                  {viewActions}
                </ActionPanel>
              }
            />
          )}
          {!lead && (
            <List.Item
              id="open"
              title={`Open ${preflight.repo}`}
              subtitle={sub("No packages, and no tap from the same owner")}
              icon={Icon.Globe}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open Repository" url={`https://${preflight.repo}`} />
                  {viewActions}
                </ActionPanel>
              }
            />
          )}
          {anywayRow(false)}
        </List.Section>
      );
    }
    case "not-found": {
      const lead = preflight.lead;
      if (!lead) return <List.Section title="Can't See This Repository">{anywayRow(true)}</List.Section>;
      const leadAdded = props.knownTaps.includes(lead.target.tap);
      return (
        <List.Section title={`${target.tap} Isn't a Tap`}>
          {installRow(
            lead.target,
            packageName(lead.target),
            false,
            `from ${lead.target.tap}${leadAdded ? " · already added" : ""}`,
            leadKindKnown(lead),
          )}
          {anywayRow(true)}
        </List.Section>
      );
    }
    case "unchecked":
      return (
        <List.Section title="Add">
          {addRow(target, undefined, `${tapSource(target)} · Contents not checked`)}
        </List.Section>
      );
  }
}
