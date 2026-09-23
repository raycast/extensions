import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useMemo } from "react";
import CliDiagnosticsCommand from "./cli-diagnostics";
import { AddEntryForm } from "./components/add-entry-form";
import { BreakControlForm } from "./components/break-control-form";
import { CreateBlockForm } from "./components/create-block-form";
import { StartBlockForm } from "./components/start-block-form";
import { StopPasswordForm } from "./components/stop-password-form";
import { useBlocksWithStatus } from "./hooks/use-blocks";
import { getBlockMenuPolicy, type BlockPrimaryAction, type BlockSecondaryAction } from "./lib/block-menu";
import { buildStartArgs, buildStopArgs } from "./lib/command-builders";
import { getExecutablePath, type BlockInfo } from "./lib/cold-turkey";
import { blockKindLabel, classifyStopPasswordError, compactCliOutput, type BlockState } from "./lib/cli-output";
import { cliErrorText, confirmPotentialLock, executeCli, formatCliError } from "./lib/ui";

type Revalidate = () => void | Promise<unknown>;

export default function ManageBlocksCommand() {
  const { data: blocks = [], isLoading, error, revalidate } = useBlocksWithStatus();

  const sortedBlocks = useMemo(() => [...blocks].sort((left, right) => left.name.localeCompare(right.name)), [blocks]);

  const sections = useMemo(
    () => [
      {
        state: "enabled" as const,
        title: "Enabled",
        blocks: sortedBlocks.filter((block) => block.state === "enabled"),
      },
      {
        state: "disabled" as const,
        title: "Disabled",
        blocks: sortedBlocks.filter((block) => block.state === "disabled"),
      },
      {
        state: "unknown" as const,
        title: "Unknown Status",
        blocks: sortedBlocks.filter((block) => block.state === "unknown"),
      },
    ],
    [sortedBlocks],
  );

  const hasNoBlocks = !isLoading && blocks.length === 0;
  const hasNoMatchingBlocks = !isLoading && blocks.length > 0;
  const emptyTitle = error ? "Could Not Load Cold Turkey Blocks" : "No Cold Turkey Blocks Found";
  const emptyDescription = error
    ? formatCliError(error)
    : "Create a block here, or verify that your Cold Turkey version supports -list-blocks.";

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search by name, status, or block type…"
    >
      {hasNoBlocks ? (
        <List.EmptyView
          icon={Icon.Shield}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            error ? (
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action.Push title="Open CLI Diagnostics" icon={Icon.Terminal} target={<CliDiagnosticsCommand />} />
                <OpenColdTurkeyAction />
                <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
              </ActionPanel>
            ) : (
              <ActionPanel>
                <Action.Push
                  title="Create Block…"
                  icon={Icon.Plus}
                  target={<CreateBlockForm onSuccess={revalidateAsVoid(revalidate)} />}
                />
                <Action title="Refresh Blocks" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <OpenColdTurkeyAction />
              </ActionPanel>
            )
          }
        />
      ) : hasNoMatchingBlocks ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Blocks"
          description="Search by block name, Enabled or Disabled status, Website, App, or Device."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Block…"
                icon={Icon.Plus}
                target={<CreateBlockForm onSuccess={revalidateAsVoid(revalidate)} />}
              />
              <Action title="Refresh Blocks" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <OpenColdTurkeyAction />
            </ActionPanel>
          }
        />
      ) : null}

      {!hasNoBlocks
        ? sections.map((section) =>
            section.blocks.length > 0 ? (
              <List.Section key={section.state} title={section.title} subtitle={String(section.blocks.length)}>
                {section.blocks.map((block) => (
                  <BlockListItem key={`${block.kind}:${block.name}`} block={block} revalidate={revalidate} />
                ))}
              </List.Section>
            ) : null,
          )
        : null}
    </List>
  );
}

function BlockListItem({ block, revalidate }: { block: BlockInfo; revalidate: Revalidate }) {
  const { push } = useNavigation();
  const presentation = statusPresentation(block.state);
  const policy = getBlockMenuPolicy(block);
  const isDevice = block.kind === "device";
  const refresh = revalidateAsVoid(revalidate);

  async function startUnlocked() {
    if (
      isDevice &&
      !(await confirmPotentialLock(
        `Enable schedule for ${block.name}?`,
        "This enables the device block schedule and may activate its configured lock-screen, sign-out, or shut-down action.",
        "Enable Schedule",
      ))
    ) {
      return;
    }

    await executeCli({
      args: buildStartArgs({ blockName: block.name, mode: "unlocked" }),
      workingTitle: isDevice ? `Enabling schedule for ${block.name}…` : `Starting ${block.name}…`,
      successTitle: isDevice ? `Enabled schedule for ${block.name}` : `Started ${block.name}`,
      verification: { type: "state", block, expectedState: "enabled" },
      onSuccess: refresh,
    });
  }

  async function stopBlock() {
    await executeCli({
      args: buildStopArgs(block.name),
      workingTitle: isDevice ? `Disabling schedule for ${block.name}…` : `Stopping ${block.name}…`,
      successTitle: isDevice ? `Disabled schedule for ${block.name}` : `Stopped ${block.name}`,
      verification: { type: "state", block, expectedState: "disabled" },
      onSuccess: refresh,
      onError: (error) => {
        if (classifyStopPasswordError(cliErrorText(error)) !== "password-required") return false;

        push(<StopPasswordForm blockName={block.name} blockKind={block.kind} onSuccess={refresh} />);
        return true;
      },
    });
  }

  const statusTooltip = [
    compactCliOutput(block.rawStatus, 400) ?? `Status: ${presentation.label}`,
    "Cold Turkey -status reports enabled/disabled only; it does not reveal lock type or remaining lock time.",
  ].join("\n\n");

  return (
    <List.Item
      id={`${block.kind}:${block.name}`}
      title={block.name}
      subtitle={{
        value: blockKindLabel(block.kind),
        tooltip: typeTooltip(block),
      }}
      keywords={blockSearchKeywords(block)}
      icon={{ source: presentation.icon, tintColor: presentation.color }}
      accessories={[
        {
          tag: { value: presentation.label, color: presentation.color },
          tooltip: statusTooltip,
        },
      ]}
      actions={
        <ActionPanel title={block.name}>
          <ActionPanel.Section>
            {blockPrimaryAction(policy.primaryAction, {
              isDevice,
              revalidate: refresh,
              startUnlocked,
              stopBlock,
            })}
            {policy.secondaryAction
              ? blockSecondaryAction(policy.secondaryAction, {
                  block,
                  revalidate: refresh,
                })
              : null}
          </ActionPanel.Section>

          {policy.showWebsiteEditing || policy.showBreakControls ? (
            <ActionPanel.Section title="Manage">
              {policy.showWebsiteEditing ? (
                <Action.Push
                  title="Add Websites or Exceptions…"
                  icon={Icon.Globe}
                  target={<AddEntryForm blockName={block.name} onSuccess={refresh} />}
                />
              ) : null}
              {policy.showBreakControls ? (
                <Action.Push
                  title="Control Break…"
                  icon={Icon.Stopwatch}
                  target={<BreakControlForm blockName={block.name} onSuccess={refresh} />}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}

          <ActionPanel.Section title="Blocks">
            <Action.Push
              title="Create Block…"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<CreateBlockForm onSuccess={refresh} />}
            />
            {policy.primaryAction !== "refresh" ? (
              <Action
                title="Refresh Blocks"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section title="Cold Turkey">
            <OpenColdTurkeyAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface PrimaryActionContext {
  isDevice: boolean;
  revalidate: () => Promise<void>;
  startUnlocked: () => Promise<void>;
  stopBlock: () => Promise<void>;
}

function blockPrimaryAction(action: BlockPrimaryAction, context: PrimaryActionContext) {
  switch (action) {
    case "start":
      return (
        <Action
          title={context.isDevice ? "Enable Device Schedule (No Lock)" : "Start Unlocked"}
          icon={Icon.Play}
          onAction={context.startUnlocked}
        />
      );
    case "stop":
      return (
        <Action
          title={context.isDevice ? "Disable Device Block Schedule" : "Stop Block"}
          icon={Icon.Stop}
          onAction={context.stopBlock}
        />
      );
    case "refresh":
      return <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={context.revalidate} />;
  }
}

interface SecondaryActionContext {
  block: BlockInfo;
  revalidate: () => Promise<void>;
}

function blockSecondaryAction(action: BlockSecondaryAction, context: SecondaryActionContext) {
  switch (action) {
    case "start-options":
      return (
        <Action.Push
          title="Start Options…"
          icon={Icon.Lock}
          target={
            <StartBlockForm
              blockName={context.block.name}
              blockKind={context.block.kind}
              onSuccess={context.revalidate}
            />
          }
        />
      );
    case "diagnostics":
      return <Action.Push title="Open CLI Diagnostics" icon={Icon.Terminal} target={<CliDiagnosticsCommand />} />;
  }
}

function revalidateAsVoid(revalidate: Revalidate): () => Promise<void> {
  return async () => {
    await revalidate();
  };
}

function OpenColdTurkeyAction() {
  return <Action.Open title="Open Cold Turkey" icon={Icon.AppWindow} target={coldTurkeyOpenTarget()} />;
}

function coldTurkeyOpenTarget(): string {
  const executablePath = getExecutablePath();
  const appIndex = process.platform === "darwin" ? executablePath.toLowerCase().indexOf(".app/") : -1;
  return appIndex >= 0 ? executablePath.slice(0, appIndex + ".app".length) : executablePath;
}

function blockSearchKeywords(block: BlockInfo): string[] {
  const kindKeywords =
    block.kind === "website-app"
      ? ["website", "web", "app", "website app"]
      : block.kind === "device"
        ? ["device", "schedule", "lock screen", "sign out", "shut down"]
        : ["unknown type"];

  return [blockKindLabel(block.kind), block.kind, block.state, statusPresentation(block.state).label, ...kindKeywords];
}

function statusPresentation(state: BlockState): {
  label: string;
  icon: Icon;
  color: Color;
} {
  switch (state) {
    case "enabled":
      return { label: "Enabled", icon: Icon.Play, color: Color.Red };
    case "disabled":
      return { label: "Disabled", icon: Icon.Stop, color: Color.SecondaryText };
    case "unknown":
      return {
        label: "Unknown",
        icon: Icon.QuestionMarkCircle,
        color: Color.Yellow,
      };
  }
}

function typeTooltip(block: BlockInfo): string {
  if (block.kind === "device") {
    return "Device-block status indicates whether its schedule is enabled. It does not prove the device action is active right now.";
  }
  if (block.kind === "website-app") return "Website & app block";
  return "The installed CLI did not identify this block's type.";
}
