import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ListErrorView } from "./components/error-view";
import { sentence, showHexFailure } from "./lib/feedback";
import { hex } from "./lib/hex";
import { DoneReply, Model, ModelsReply } from "./lib/types";

const languageName = new Intl.DisplayNames(undefined, { type: "language" });

function describeLanguage(code: string): string {
  if (code === "*" || code === "auto") return "Any Language";
  try {
    return languageName.of(code) ?? code;
  } catch {
    return code;
  }
}

function languagesText(model: Model): string {
  if (model.languages.length === 1) return describeLanguage(model.languages[0]);
  return `${model.languages.length} languages`;
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(() => hex<ModelsReply>(["model", "list"]), [], {
    onError: () => undefined,
  });
  const [searchText, setSearchText] = useState("");
  const models = data?.models ?? [];
  const installed = models.filter((model) => model.installed);
  const available = models.filter((model) => !model.installed);

  async function use(model: Model, language?: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Switching to ${model.name}`,
    });
    try {
      const args = ["model", "use", model.id];
      if (language) args.push("--language", language);
      const reply = await hex<DoneReply>(args, { timeoutMs: 30_000 });
      toast.style = Toast.Style.Success;
      toast.title = reply.changed ? `Switched to ${model.name}` : sentence(reply.message);
      revalidate();
    } catch (error) {
      toast.hide();
      await showHexFailure(error, `Couldn't switch to ${model.name}`);
    }
  }

  async function install(model: Model) {
    const confirmed = await confirmAlert({
      title: `Download ${model.name}?`,
      message: `${model.size}. Hex downloads it in the background and switches to it when it's ready.`,
      icon: Icon.Download,
      primaryAction: { title: "Download", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
    try {
      const reply = await hex<DoneReply>(["model", "install", model.id]);
      await showToast({
        style: Toast.Style.Success,
        title: sentence(reply.message),
      });
      revalidate();
    } catch (error) {
      await showHexFailure(error, `Couldn't download ${model.name}`);
    }
  }

  function item(model: Model) {
    return (
      <List.Item
        key={model.id}
        icon={
          model.selected
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : model.installed
              ? Icon.Circle
              : Icon.Download
        }
        title={model.name}
        subtitle={languagesText(model)}
        keywords={[model.id, ...model.languages.map(describeLanguage)]}
        accessories={[
          ...(model.selected ? [{ tag: { value: "In Use", color: Color.Green } }] : []),
          { text: model.size },
        ]}
        actions={
          <ActionPanel>
            {model.installed ? (
              <>
                <Action title="Use Model" icon={Icon.CheckCircle} onAction={() => use(model)} />
                {model.languages.length > 1 && (
                  <ActionPanel.Submenu title="Use with Language" icon={Icon.Globe}>
                    {model.languages.map((code) => (
                      <Action key={code} title={describeLanguage(code)} onAction={() => use(model, code)} />
                    ))}
                  </ActionPanel.Submenu>
                )}
              </>
            ) : (
              <Action title="Download Model" icon={Icon.Download} onAction={() => install(model)} />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} filtering onSearchTextChange={setSearchText} searchBarPlaceholder="Search models">
      {error ? (
        <ListErrorView error={error} onRetry={revalidate} />
      ) : isLoading ? null : (
        <List.EmptyView icon={Icon.Waveform} title={searchText ? "No matching models" : "No models"} />
      )}
      <List.Section title="Downloaded">{installed.map(item)}</List.Section>
      <List.Section title="Available to Download">{available.map(item)}</List.Section>
    </List>
  );
}
