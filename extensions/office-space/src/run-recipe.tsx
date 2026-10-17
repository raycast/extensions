import { Action, ActionPanel, Form, Icon, List, open, showToast, Toast, useNavigation, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Unavailable } from "./components/Unavailable";
import { abbreviate, linkTo } from "./lib/format";
import { hub } from "./lib/hub";
import { Agent, Recipe } from "./lib/types";

async function run(recipe: Recipe, overrides: { prompt?: string; branch?: string } = {}) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${recipe.name}…` });
  const args = ["run", recipe.slug];
  if (overrides.prompt?.trim()) args.push("--prompt", overrides.prompt.trim());
  if (overrides.branch?.trim()) args.push("--branch", overrides.branch.trim());
  try {
    const agent = await hub<Agent>(args, { timeout: 60_000 });
    toast.style = Toast.Style.Success;
    toast.title = `Started ${agent.name}`;
    toast.message = abbreviate(agent.worktreePath ?? agent.workingDirectory);
    await open(linkTo(`agent/${encodeURIComponent(agent.id)}`));
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't start ${recipe.name}` });
  }
}

function RunWithForm(props: { recipe: Recipe }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={props.recipe.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Agent"
            icon={Icon.Play}
            onSubmit={async (values: { prompt: string; branch: string }) => {
              pop();
              await run(props.recipe, values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="First Message" defaultValue={props.recipe.prompt} />
      {props.recipe.worktree && (
        <Form.TextField id="branch" title="Branch" placeholder={`${props.recipe.branchPrefix}${props.recipe.slug}-…`} />
      )}
      <Form.Description title="Folder" text={props.recipe.folder} />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading, error } = useCachedPromise(() => hub<Recipe[]>(["recipes"]));
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Run a recipe">
      {error && !data ? (
        <Unavailable error={error} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.Book}
            title="No recipes yet"
            description="Save one from Office Space's New Agent window (Save as Recipe…)."
            actions={
              <ActionPanel>
                <Action title="Open New Agent Window" icon={Icon.Plus} onAction={() => open(linkTo("new-agent"))} />
              </ActionPanel>
            }
          />
          {(data ?? []).map((recipe) => (
            <List.Item
              key={recipe.slug}
              icon={Icon.Play}
              title={recipe.name}
              subtitle={abbreviate(recipe.folder)}
              accessories={[
                ...(recipe.servers.length ? [{ icon: Icon.HardDrive, text: recipe.servers.join(", ") }] : []),
                {
                  tag:
                    recipe.kind === "custom"
                      ? (recipe.command ?? "command")
                      : recipe.kind === "codex"
                        ? "Codex"
                        : "Claude Code",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Start Agent" icon={Icon.Play} onAction={() => run(recipe)} />
                  <Action.Push
                    title="Start with a Different Message…"
                    icon={Icon.Pencil}
                    target={<RunWithForm recipe={recipe} />}
                  />
                  <Action
                    title="Open in New Agent Window"
                    icon={Icon.AppWindow}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() => open(linkTo(`new-agent?recipe=${encodeURIComponent(recipe.slug)}`))}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
