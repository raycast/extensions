import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  closeMainWindow,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  QuickAddChoiceWithVault,
  QuickAddState,
  buildQuickAddUri,
  getDefaultVariableName,
  loadQuickAddState,
} from "./quickadd-service";

const QUICKADD_ICON = { source: "quickadd.png" };

type ChoiceListProps = {
  initialText?: string;
  directSend?: boolean;
};

export function ChoiceList({ initialText = "", directSend = false }: ChoiceListProps) {
  const [state, setState] = useState<QuickAddState | null>(null);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState(initialText);

  async function load() {
    setIsLoading(true);
    setError(undefined);

    try {
      const nextState = await loadQuickAddState();
      setState(nextState);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setState(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const choices = state?.choices || [];
  const searchBarPlaceholder = directSend ? "Enter text to send to QuickAdd" : "Search QuickAdd choices";

  return (
    <List
      isLoading={isLoading}
      filtering={directSend ? false : undefined}
      searchText={directSend ? inputText : undefined}
      onSearchTextChange={directSend ? setInputText : undefined}
      searchBarPlaceholder={searchBarPlaceholder}
      navigationTitle="Obsidian QuickAdd"
      isShowingDetail={Boolean(state)}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load QuickAdd Choices"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Refresh Choices" icon={Icon.ArrowClockwise} onAction={load} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : choices.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.List}
          title="No QuickAdd Choices Found"
          description="Check that QuickAdd is installed and has choices configured in at least one detected vault."
          actions={
            <ActionPanel>
              <Action title="Refresh Choices" icon={Icon.ArrowClockwise} onAction={load} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : (
        choices.map((choice) => (
          <ChoiceListItem
            key={`${choice.vault.id}:${choice.vault.path}:${choice.name}`}
            choice={choice}
            inputText={directSend ? inputText : initialText}
            directSend={directSend}
            onRefresh={load}
          />
        ))
      )}
    </List>
  );
}

function ChoiceListItem({
  choice,
  inputText,
  directSend,
  onRefresh,
}: {
  choice: QuickAddChoiceWithVault;
  inputText: string;
  directSend: boolean;
  onRefresh: () => void;
}) {
  const vaultName = choice.vault.name;
  const detail = [
    `# ${escapeMarkdown(choice.name)}`,
    "",
    `${escapeMarkdown(vaultName || "Default Obsidian Vault")} · ${escapeMarkdown(choice.type)}${
      choice.group ? ` · ${escapeMarkdown(choice.group)}` : ""
    }`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return (
    <List.Item
      icon={QUICKADD_ICON}
      title={choice.name}
      subtitle={`${choice.vault.name} · ${choice.group || choice.type}`}
      detail={
        <List.Item.Detail
          markdown={detail}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Vault" text={vaultName} icon={Icon.Folder} />
              <List.Item.Detail.Metadata.Label title="Choice Type" text={choice.type} icon={Icon.Document} />
              {choice.group ? (
                <List.Item.Detail.Metadata.Label title="Group" text={choice.group} icon={Icon.List} />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Vault Path" text={choice.vault.path} icon={Icon.HardDrive} />
              <List.Item.Detail.Metadata.Label title="Source" text="Latest QuickAdd config" icon={Icon.CheckCircle} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {directSend ? (
            <Action
              title="Send to QuickAdd"
              icon={Icon.Airplane}
              onAction={() =>
                runChoice({
                  choice,
                  vaultName,
                  variableName: getDefaultVariableName(),
                  value: inputText,
                })
              }
            />
          ) : (
            <Action.Push
              title="Enter Text"
              icon={Icon.Text}
              target={<ChoiceForm choice={choice} vaultName={vaultName} initialValue={inputText} />}
            />
          )}
          {directSend ? (
            <Action.Push
              title="Edit Text Before Sending"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={<ChoiceForm choice={choice} vaultName={vaultName} initialValue={inputText} />}
            />
          ) : null}
          <Action
            title="Refresh Choices"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function escapeMarkdown(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("*", "\\*").replaceAll("_", "\\_");
}

function ChoiceForm({
  choice,
  vaultName,
  initialValue,
}: {
  choice: QuickAddChoiceWithVault;
  vaultName: string;
  initialValue: string;
}) {
  const defaultVariableName = getDefaultVariableName();

  return (
    <Form
      navigationTitle={choice.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run QuickAdd"
            icon={Icon.Airplane}
            onSubmit={(values: { variableName: string; value: string }) =>
              runChoice({
                choice,
                vaultName,
                variableName: values.variableName,
                value: values.value,
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Choice" text={choice.group ? `${choice.name} · ${choice.group}` : choice.name} />
      <Form.TextField id="variableName" title="Variable Name" defaultValue={defaultVariableName} />
      <Form.TextField id="value" title="Text" defaultValue={initialValue} autoFocus />
    </Form>
  );
}

async function runChoice({
  choice,
  vaultName,
  variableName,
  value,
}: {
  choice: QuickAddChoiceWithVault;
  vaultName: string;
  variableName: string;
  value: string;
}) {
  try {
    const uri = buildQuickAddUri({
      vaultName,
      choiceName: choice.name,
      variableName,
      value,
    });

    await open(uri);
    await showToast({ style: Toast.Style.Success, title: "Sent to QuickAdd", message: choice.name });
    await popToRoot({ clearSearchBar: true });
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Run QuickAdd",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
