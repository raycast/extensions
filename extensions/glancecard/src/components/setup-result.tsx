// What a setup comes to: a whole workflow for whoever has none (or starts over), or one card's
// change to the workflow they have; then the README embeds and the GitHub pages that take them.
// Nothing is written on GitHub from here: every change is a page the viewer commits, so the
// extension needs no write access to anyone's repositories.
import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, open, showHUD, showToast, Toast } from "@raycast/api";
import { REPO_SECTIONS } from "glancecard";
import { plan, seasonHint } from "glancecard/setup";
import { useMemo } from "react";
import {
  DEPENDABOT_PATH,
  WORKFLOW_PATH,
  dependabotEntry,
  buildPrompt,
  buildWorkflow,
  dependabotFile,
  editFileUrl,
  fileBase,
  newFileUrl,
  planOf,
  profileEmbed,
  readmeEditUrl,
  repositoryEmbed,
  workflowRunUrl,
  type FoundWorkflow,
  type SetupStatus,
  type Setup,
} from "../lib/setup";
import { lineDiff, placeCard, reposBeside, type CardRef } from "../lib/workflow-patch";
import type { SetupRequest } from "./setup-form";

const fence = (lang: string, text: string) => `\`\`\`${lang}\n${text.trimEnd()}\n\`\`\``;

const copy = async (text: string, what: string) => {
  await Clipboard.copy(text);
  await showHUD(`Copied ${what}`);
};

/** A README embed: where it goes, and the text. */
interface Embed {
  /** The repository whose README takes it. */
  full: string;
  title: string;
  text: string;
}

/** Copies an embed and opens the README editor of the repository it belongs in. */
function EmbedAction({ embed }: { embed: Embed }) {
  return (
    <Action
      title={`Copy ${embed.title} Embed and Edit README`}
      icon={Icon.Pencil}
      onAction={async () => {
        await Clipboard.copy(embed.text);
        const toast = await showToast({ style: Toast.Style.Animated, title: `Opening ${embed.full}'s README` });
        try {
          await open(await readmeEditUrl(embed.full));
          toast.style = Toast.Style.Success;
          toast.title = "Embed copied";
          toast.message = "Paste it where the card belongs, then commit";
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = `Could not open ${embed.full}`;
          toast.message = error instanceof Error ? error.message : String(error);
        }
      }}
    />
  );
}

/** The workflow's file, put on GitHub: a filled-in "new file" page, or the copied text over the existing one. */
function WorkflowAction({
  status,
  path,
  text,
  exists,
}: {
  status: SetupStatus;
  path: string;
  text: string;
  exists: boolean;
}) {
  const branch = status.home?.branch ?? "main";
  if (!exists) {
    return (
      <Action.OpenInBrowser
        title="Add Workflow on GitHub"
        icon={Icon.Upload}
        url={newFileUrl(status.login, branch, path, text)}
      />
    );
  }
  return (
    <Action
      title="Copy Workflow and Open It on GitHub"
      icon={Icon.Upload}
      onAction={async () => {
        await Clipboard.copy(text);
        await showToast({ title: "Workflow copied", message: "Select all in GitHub's editor, paste, commit" });
        await open(editFileUrl(status.login, branch, path));
      }}
    />
  );
}

/** A whole workflow, for a viewer without one or starting over. */
export function SetupResult({ setup, status }: { setup: Setup; status: SetupStatus }) {
  const { login, home, workflow: existing } = status;
  const branch = home?.branch ?? "main";
  const version = status.latest;
  const p = planOf(setup);
  const yaml = buildWorkflow(setup, login, version);
  const path = existing?.path ?? WORKFLOW_PATH;
  const embeds: Embed[] = [
    ...(setup.profile ? [{ full: `${login}/${login}`, title: "Profile", text: profileEmbed(p, login) }] : []),
    ...setup.repos.map((full) => ({
      full,
      title: full,
      text: repositoryEmbed(p, full, fileBase(setup.repos, full), { login, branch }),
    })),
  ];
  const needsDependabot = !status.dependabot.watchesActions;

  const markdown = [
    `# Your glancecard setup`,
    `glancecard **${version}**, refreshing the cards in \`${login}/${login}\`.`,
    p.season ? `> ${seasonHint(p.season, p.seasonPaired)}` : "",
    !home
      ? `**First, create your profile repository**, \`${login}/${login}\`, with a README (tick *Add a README file*): the cards live there, and its README is the first one people see. Then open *Set up Glancecard* again, and the workflow and the embeds go there in a click.`
      : "",
    existing
      ? `**This replaces \`${path}\`**, the whole file${existing.steps > 1 ? ` and its ${existing.steps} glancecard steps` : ""}: to change one card and keep the rest, open that card and use *Use on GitHub*. The action copies the whole file: in GitHub's editor, select all (⌘A) and paste over it.`
      : `**The workflow**, \`${WORKFLOW_PATH}\`:`,
    fence("yaml", yaml),
    needsDependabot
      ? status.dependabot.present
        ? `**Let Dependabot move the version**: add this entry under \`updates:\` in \`${DEPENDABOT_PATH}\`:\n\n${fence("yaml", dependabotEntry())}`
        : `**Let Dependabot move the version**, \`${DEPENDABOT_PATH}\`:\n\n${fence("yaml", dependabotFile())}`
      : "",
    `**Run it once** from the Actions tab, then put the cards in your READMEs:`,
    ...embeds.map((e) => `**${e.title}**:\n\n${fence("html", e.text)}`),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle="Your Glancecard Setup"
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="On GitHub">
            {!home ? (
              <Action.OpenInBrowser
                title="Create Profile Repository"
                icon={Icon.PlusCircle}
                url={`https://github.com/new?name=${encodeURIComponent(login)}&visibility=public`}
              />
            ) : null}
            {home ? <WorkflowAction status={status} path={path} text={yaml} exists={Boolean(existing)} /> : null}
            {home && needsDependabot ? (
              status.dependabot.present ? (
                <Action
                  title="Copy Dependabot Entry and Open It on GitHub"
                  icon={Icon.Repeat}
                  onAction={async () => {
                    await Clipboard.copy(dependabotEntry());
                    await open(editFileUrl(login, branch, DEPENDABOT_PATH));
                  }}
                />
              ) : (
                <Action.OpenInBrowser
                  title="Add Dependabot on GitHub"
                  icon={Icon.Repeat}
                  url={newFileUrl(login, branch, DEPENDABOT_PATH, dependabotFile())}
                />
              )
            ) : null}
            {home ? (
              <Action.OpenInBrowser title="Run It on GitHub" icon={Icon.Play} url={workflowRunUrl(login, path)} />
            ) : null}
            {embeds.map((e) =>
              // Without a profile repository there is no README to edit yet, nor a branch to name.
              home ? <EmbedAction key={e.full} embed={e} /> : null,
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            {setup.profile ? (
              <Action
                title="Copy Prompt for a Coding Agent"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => copy(buildPrompt(setup, version), "the prompt: paste it into Claude Code or Codex")}
              />
            ) : null}
            <Action
              title="Copy Workflow"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copy(yaml, "the workflow")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** One card's change to the workflow the viewer has: the diff, the file, the card's new embed. */
export function PatchResult({
  request,
  status,
  workflow,
}: {
  request: SetupRequest;
  status: SetupStatus;
  workflow: FoundWorkflow;
}) {
  const { login, home } = status;
  const branch = home?.branch ?? "main";
  const card: CardRef = request.repo ? { kind: "repo", full: request.repo } : { kind: "profile", login };
  const p = plan({
    ...request.choice,
    sections: request.sections && request.sections.length < REPO_SECTIONS.length ? request.sections : undefined,
    // The embed's credit line says how often the workflow already refreshes.
    refresh: { often: workflow.setup.choice.refresh.often },
  });
  const result = useMemo(() => {
    try {
      const want = {
        theme: p.theme ?? "both",
        calendar: p.calendar ?? "chart",
        stars: p.stars ?? "steps",
        sections: p.sections ?? "all",
      };
      return { patched: placeCard(workflow.text, card, want) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [workflow.text, JSON.stringify(card), JSON.stringify(p)]);

  if ("error" in result) {
    return (
      <Detail
        markdown={`# Could not change \`${workflow.path}\`\n\n${result.error}\n\nUse *Set up Glancecard* to start over with a new workflow.`}
      />
    );
  }
  const { patched } = result;
  const unchanged = patched.text === workflow.text;
  const outDir = patched.outDir;
  const embed: Embed =
    card.kind === "profile"
      ? { full: `${login}/${login}`, title: "Profile", text: profileEmbed(p, login, outDir) }
      : {
          full: card.full,
          title: card.full,
          text: repositoryEmbed(p, card.full, fileBase(reposBeside(patched.text, card), card.full), {
            login,
            branch,
            outDir,
          }),
        };
  const what = card.kind === "profile" ? "Your profile card" : card.full;

  const markdown = [
    `# ${what} on GitHub`,
    p.season ? `> ${seasonHint(p.season, p.seasonPaired)}` : "",
    unchanged
      ? `Your workflow, \`${workflow.path}\`, already draws ${card.kind === "profile" ? "it" : "this card"} this way: only the embed is left.`
      : `**A change to \`${workflow.path}\`**, the rest of the file as it is:\n\n${patched.changes.map((c) => `- ${c}`).join("\n")}\n\n${fence("diff", lineDiff(workflow.text, patched.text))}`,
    unchanged
      ? ""
      : `*Copy Workflow and Open It on GitHub* copies the whole file: in GitHub's editor, select all (⌘A), paste over it and commit. Then **run it once** from the Actions tab.`,
    `**The embed** for ${card.kind === "profile" ? "your profile README" : `${card.full}'s README`}${unchanged ? "" : ": the file names follow the look, so an embed already there needs this one"}:`,
    fence("html", embed.text),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      navigationTitle={`${what} on GitHub`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {unchanged ? null : <WorkflowAction status={status} path={workflow.path} text={patched.text} exists />}
          <EmbedAction embed={embed} />
          <Action.OpenInBrowser title="Run It on GitHub" icon={Icon.Play} url={workflowRunUrl(login, workflow.path)} />
          <Action title="Copy Embed" icon={Icon.Code} onAction={() => copy(embed.text, "the embed")} />
          {unchanged ? null : (
            <Action
              title="Copy Workflow"
              icon={Icon.CopyClipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copy(patched.text, "the workflow")}
            />
          )}
          <Action.OpenInBrowser title="Open Workflow on GitHub" url={workflow.url} />
        </ActionPanel>
      }
    />
  );
}
