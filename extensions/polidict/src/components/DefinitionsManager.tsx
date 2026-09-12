import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createApiClient } from "../api";
import { DefinitionForm } from "./DefinitionForm";
import { formatDefinitionMarkdown } from "./DefinitionsList";
import type { ItemDefinition, SupportedLanguage } from "../types";
import { MAX_DEFINITIONS } from "../constants";
import { formatRaycastError } from "../utils";

interface DefinitionsManagerProps {
  definitions: ItemDefinition[];
  onChange: (definitions: ItemDefinition[]) => void;
  text: string;
  currentLanguage: SupportedLanguage;
  hasAIAccess: boolean;
}

export function DefinitionsManager({
  definitions,
  onChange,
  text,
  currentLanguage,
  hasAIAccess,
}: DefinitionsManagerProps) {
  const { pop, push } = useNavigation();
  const [showingDetail, setShowingDetail] = useState(false);
  const [isSuggestingDefinition, setIsSuggestingDefinition] = useState(false);

  function handleEditDefinition(index: number) {
    push(
      <DefinitionForm
        definition={definitions[index]}
        onSave={(updated) => {
          const newDefs = [...definitions];
          newDefs[index] = updated;
          onChange(newDefs);
        }}
        text={text}
        currentLanguage={currentLanguage}
        hasAIAccess={hasAIAccess}
      />,
    );
  }

  function handleAddDefinition() {
    push(
      <DefinitionForm
        onSave={(newDef) => {
          onChange([...definitions, newDef]);
        }}
        text={text}
        currentLanguage={currentLanguage}
        hasAIAccess={hasAIAccess}
      />,
    );
  }

  async function handleDeleteDefinition(index: number) {
    const confirmed = await confirmAlert({
      title: "Delete Definition",
      message: "Are you sure you want to delete this definition?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const newDefs = definitions.filter((_, i) => i !== index);
      onChange(newDefs);
    }
  }

  async function handleSuggestDefinition() {
    if (definitions.length >= MAX_DEFINITIONS || isSuggestingDefinition) return;
    setIsSuggestingDefinition(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating definition...",
    });

    try {
      const client = createApiClient();
      const response = await client.suggestions.getSuggestion(currentLanguage, {
        text,
        definitions,
        suggestionTarget: { type: "DEFINITION" },
      });

      const newDef = response?.definitions?.[0];
      if (!newDef) {
        toast.style = Toast.Style.Failure;
        toast.title = "Suggestion failed, try again";
        return;
      }

      onChange([...definitions, newDef]);
      toast.style = Toast.Style.Success;
      toast.title = "Definition added";
    } catch (error) {
      const userError = formatRaycastError(error);
      toast.style = Toast.Style.Failure;
      toast.title = userError.title;
      toast.message = userError.description;
    } finally {
      setIsSuggestingDefinition(false);
    }
  }

  return (
    <List navigationTitle="Manage Definitions" isShowingDetail={showingDetail} isLoading={isSuggestingDefinition}>
      <List.EmptyView
        title="No Definitions"
        description="Add a definition to get started"
        actions={
          <ActionPanel>
            <Action title="Add Definition" icon={Icon.Plus} onAction={handleAddDefinition} />
            {hasAIAccess && text.length >= 2 && (
              <Action
                title="Suggest Definition"
                icon={Icon.Wand}
                shortcut={{ modifiers: ["cmd"], key: "g" }}
                onAction={handleSuggestDefinition}
              />
            )}
            <Action title="Done" icon={Icon.Check} onAction={pop} />
          </ActionPanel>
        }
      />

      {definitions.map((def, index) => (
        <List.Item
          key={def.id ?? index}
          title={def.translation ?? def.definition ?? "—"}
          subtitle={showingDetail ? undefined : def.translation ? def.definition : undefined}
          accessories={
            showingDetail
              ? undefined
              : [
                  ...(def.comment ? [{ text: "💬" }] : []),
                  ...(def.examples?.length ? [{ text: `${def.examples.length}ex` }] : []),
                ]
          }
          detail={<List.Item.Detail markdown={formatDefinitionMarkdown(def)} />}
          actions={
            <ActionPanel>
              <Action title="Edit" icon={Icon.Pencil} onAction={() => handleEditDefinition(index)} />
              <Action
                title="Add Definition"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={handleAddDefinition}
              />
              {hasAIAccess && text.length >= 2 && definitions.length < MAX_DEFINITIONS && (
                <Action
                  title="Suggest Definition"
                  icon={Icon.Wand}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                  onAction={handleSuggestDefinition}
                />
              )}
              <Action
                title={showingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={() => setShowingDetail(!showingDetail)}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDeleteDefinition(index)}
              />
              <Action title="Done" icon={Icon.Check} shortcut={{ modifiers: ["cmd"], key: "return" }} onAction={pop} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
