import { Action, ActionPanel, Clipboard, Detail, Icon, Keyboard, List, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  getModel,
  getModelCard,
  type HfModel,
  huggingFaceSearchUrl,
  huggingFaceUrl,
  parseRepo,
  searchModels,
  withoutFrontMatter,
  capImageHeights,
} from "../lib/huggingface";
import { copyError } from "../lib/copy-error";
import { saveMarkdownToDownloads } from "../lib/markdown";
import { huggingFaceModelUrl, openInOsaurus } from "../lib/server-toast";

const MAX_RECENTS = 10;

// Search Hugging Face for MLX models and hand one to Osaurus to download. Builds on the Hugging Face
// extension's Search Models (recent searches, model card, a link out to the site's search). A pasted
// link or owner/name id skips the search and shows that exact model, whatever form the link took.
export function SearchModels() {
  const [query, setQuery] = useState("");
  // A search is recorded only when the user acts on one of its results, not on every keystroke.
  const [recents, setRecents] = useCachedState<string[]>("recent-model-searches", []);
  const remember = (searchTerm: string) => {
    const term = searchTerm.trim();
    if (term) setRecents((prev) => [term, ...prev.filter((t) => t !== term)].slice(0, MAX_RECENTS));
  };

  // Both lookups tag their data with the input that produced it, so rows still on screen from the
  // previous input are never taken for the current one (or recorded under its name).
  const repo = parseRepo(query);
  const {
    data: lookup,
    isLoading: isLoadingExact,
    error: exactError,
  } = usePromise(async (id: string | undefined) => (id ? { id, model: await getModel(id) } : undefined), [repo]);
  const exact = lookup?.id === repo ? lookup : undefined;
  const { data: search, isLoading } = usePromise(
    async (q: string) => ({ q, results: await searchModels(q) }),
    [query],
    { execute: !repo },
  );

  return (
    <List
      navigationTitle="Search Models"
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search MLX models, or paste a Hugging Face link…"
      filtering={false}
      throttle
      isLoading={repo ? isLoadingExact || !exact : isLoading}
    >
      {repo ? (
        exact?.model ? (
          <List.Section title="Hugging Face Link">
            <ModelItem model={exact.model} query={query} onUse={() => remember(query)} />
          </List.Section>
        ) : exactError && !isLoadingExact ? (
          <List.EmptyView
            icon={Icon.Warning}
            title="Couldn't reach Hugging Face"
            description={`${exactError.message}. Check your connection and try again.`}
          />
        ) : (
          exact && (
            <List.EmptyView
              icon={Icon.MagnifyingGlass}
              title={`No model at ${repo}`}
              description="Check the link, or search by name."
            />
          )
        )
      ) : (
        <>
          {!query.trim() && recents.length > 0 && (
            <List.Section title="Recent Searches">
              {recents.map((term) => (
                <List.Item
                  key={term}
                  title={term}
                  icon={Icon.Clock}
                  actions={
                    <ActionPanel>
                      <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setQuery(term)} />
                      <Action
                        title="Remove Recent Search"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => setRecents((prev) => prev.filter((t) => t !== term))}
                      />
                      <Action
                        title="Clear Recent Searches"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.RemoveAll}
                        onAction={() => setRecents([])}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
          <List.Section
            title={search?.q.trim() ? "Results" : "Most Downloaded MLX Models"}
            subtitle={search?.results.length ? String(search.results.length) : undefined}
          >
            {search?.results.map((m) => (
              <ModelItem key={m.id} model={m} query={search.q} onUse={() => remember(search.q)} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact" });

async function addToOsaurus(repo: string) {
  if (await openInOsaurus(huggingFaceModelUrl(repo))) await showHUD("Opened in Osaurus. Start the download there");
}

// Fetches the card unless the caller already has it, reporting progress so the action never sits silent.
async function loadCard(repo: string, card?: string): Promise<string | undefined> {
  if (card !== undefined) return card;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Fetching model card…" });
  try {
    const fetched = await getModelCard(repo);
    if (fetched === undefined) {
      toast.style = Toast.Style.Failure;
      toast.title = `${repo} has no model card`;
      toast.primaryAction = copyError(`${repo} has no model card`);
    } else {
      await toast.hide();
    }
    return fetched;
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't fetch the model card", primaryAction: copyError(error) });
    return undefined;
  }
}

async function copyCard(repo: string, card?: string) {
  const text = await loadCard(repo, card);
  if (text === undefined) return;
  await Clipboard.copy(text);
  await showToast({ style: Toast.Style.Success, title: "Copied model card as Markdown" });
}

async function saveCard(repo: string, card?: string) {
  const text = await loadCard(repo, card);
  if (text !== undefined) await saveMarkdownToDownloads(`${repo.replace("/", "--")}-model-card`, text, "model card");
}

function CardActions({ repo, card, onUse }: { repo: string; card?: string; onUse?: () => void }) {
  return (
    <ActionPanel.Section title="Model Card">
      {/* No shortcut: its natural one, ⌥⌘C, is Common.CopyName, which Copy Repo ID uses. */}
      <Action
        title="Copy Model Card as Markdown"
        icon={Icon.CopyClipboard}
        onAction={() => {
          onUse?.();
          return copyCard(repo, card);
        }}
      />
      <Action
        title="Save Model Card as Markdown"
        icon={Icon.SaveDocument}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={() => {
          onUse?.();
          return saveCard(repo, card);
        }}
      />
    </ActionPanel.Section>
  );
}

function ModelItem({ model, query, onUse }: { model: HfModel; query: string; onUse: () => void }) {
  const [owner, name] = model.id.split("/");
  const url = huggingFaceUrl(model.id);
  // Search results are already MLX-filtered; a pasted link may point at something Osaurus can't run.
  const notMlx = model.tags !== undefined && !model.tags.includes("mlx");
  const accessories: List.Item.Accessory[] = [
    ...(notMlx ? [{ tag: "Not MLX", tooltip: "Osaurus runs MLX models; this one may not load" }] : []),
    ...(model.pipeline_tag ? [{ text: model.pipeline_tag }] : []),
    { icon: Icon.Download, text: compact.format(model.downloads ?? 0), tooltip: "Downloads" },
    { icon: Icon.Heart, text: compact.format(model.likes ?? 0), tooltip: "Likes" },
  ];

  return (
    <List.Item
      title={name}
      subtitle={owner}
      icon={Icon.ComputerChip}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Add to Osaurus"
            icon={Icon.Plus}
            onAction={() => {
              onUse();
              return addToOsaurus(model.id);
            }}
          />
          <Action.Push
            title="View Model Card"
            icon={Icon.Document}
            target={<ModelCard repo={model.id} />}
            onPush={onUse}
          />
          <CardActions repo={model.id} onUse={onUse} />
          <ActionPanel.Section title="Hugging Face">
            <Action.OpenInBrowser
              title="Open on Hugging Face"
              url={url}
              shortcut={Keyboard.Shortcut.Common.Open}
              onOpen={onUse}
            />
            {query.trim() && !parseRepo(query) && (
              <Action.OpenInBrowser title="Open This Search on Hugging Face" url={huggingFaceSearchUrl(query)} />
            )}
            <Action.CopyToClipboard
              title="Copy Link"
              content={url}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onCopy={onUse}
            />
            <Action.CopyToClipboard
              title="Copy Repo ID"
              content={model.id}
              shortcut={Keyboard.Shortcut.Common.CopyName}
              onCopy={onUse}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// The repo's README, as the Hugging Face extension shows it, with the front matter hidden.
function ModelCard({ repo }: { repo: string }) {
  const { data, isLoading, error } = usePromise(getModelCard, [repo]);
  const markdown = error
    ? "Couldn't load this model card."
    : isLoading
      ? ""
      : data !== undefined
        ? capImageHeights(withoutFrontMatter(data))
        : `**${repo}** has no model card. Open it on Hugging Face for its files.`;

  return (
    <Detail
      navigationTitle={repo}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Add to Osaurus" icon={Icon.Plus} onAction={() => addToOsaurus(repo)} />
          <Action.OpenInBrowser
            title="Open on Hugging Face"
            url={huggingFaceUrl(repo)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          {data !== undefined && <CardActions repo={repo} card={data} />}
        </ActionPanel>
      }
    />
  );
}
