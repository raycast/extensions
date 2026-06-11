import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { useLookup, useUserProfile } from "./hooks";
import { createApiClient } from "./api";
import { LearningItemForm } from "./components/LearningItemForm";
import { CurrentLanguageActions } from "./components/CurrentLanguageActions";
import { formatDefinitionsMarkdown } from "./components/DefinitionsList";
import type { ItemDefinition, UnsavedLearningItem } from "./types";
import { formatRaycastError, normalizeText, playSpeech } from "./utils";
import { CommandShell, type CommandShellContext } from "./core/command-shell";
import {
  invalidateLearningItemsCache,
  invalidateLookupCache,
  invalidateUserProfileCache,
} from "./features/shared/query-keys";

function LookupWordContent({
  authIdentity,
  currentLanguage,
  languageActions,
  nativeLanguage,
  signOutAction,
}: CommandShellContext) {
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(true);
  const { canAddLearningItems } = useUserProfile(authIdentity);
  const {
    data: lookupResult,
    isLoading: lookupLoading,
    aiLoading,
    canTriggerAi,
    triggerAi,
    revalidate,
  } = useLookup(authIdentity, searchText, currentLanguage);

  const isLoading = lookupLoading || aiLoading;

  const languageCode = currentLanguage.languageCode;

  function invalidateMutationCaches() {
    invalidateLearningItemsCache(authIdentity, languageCode);
    invalidateLookupCache(authIdentity, languageCode);
    invalidateUserProfileCache(authIdentity);
  }

  async function addTextOnly(text: string) {
    if (!canAddLearningItems) {
      showToast({
        style: Toast.Style.Failure,
        title: "Limit Reached",
        message: "You have reached the maximum number of learning items. Upgrade to Polidict Plus for unlimited items.",
      });
      return;
    }
    try {
      const client = createApiClient();
      const normalizedText = normalizeText(text);
      await client.learningItems.addLearningItem(languageCode, {
        text: normalizedText,
      });
      invalidateMutationCaches();
      await revalidate();
      showToast({ style: Toast.Style.Success, title: "Added text only" });
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    }
  }

  async function addWithDefinitions(text: string, definitions: ItemDefinition[]) {
    if (!canAddLearningItems) {
      showToast({
        style: Toast.Style.Failure,
        title: "Limit Reached",
        message: "You have reached the maximum number of learning items. Upgrade to Polidict Plus for unlimited items.",
      });
      return;
    }
    try {
      const client = createApiClient();
      const item: UnsavedLearningItem = {
        text: normalizeText(text),
        definitions,
      };
      await client.learningItems.addLearningItem(languageCode, item);
      invalidateMutationCaches();
      await revalidate();
      showToast({
        style: Toast.Style.Success,
        title: "Added with definitions",
      });
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    }
  }

  async function updateWithDefinitions(itemId: string, definitions: ItemDefinition[]) {
    try {
      const client = createApiClient();
      const existing = await client.learningItems.getLearningItem(languageCode, itemId);
      await client.learningItems.updateLearningItem(languageCode, {
        ...existing,
        definitions: [...(existing.definitions ?? []), ...definitions],
      });
      invalidateMutationCaches();
      await revalidate();
      showToast({
        style: Toast.Style.Success,
        title: "Updated with definitions",
      });
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    }
  }

  const items: React.JSX.Element[] = [];
  const resultItem = lookupResult?.item;
  const isExisting = lookupResult?.source === "existing";

  if (resultItem && isExisting) {
    const hasDefinitions = resultItem.definitions.length > 0;

    items.push(
      <List.Item
        key={`existing-${resultItem.id}`}
        icon={Icon.CheckCircle}
        title={resultItem.text}
        subtitle={hasDefinitions ? (resultItem.definitions[0].definition ?? "No definitions") : "No definitions"}
        accessories={[{ tag: { value: "Your Vocabulary", color: "#4CAF50" } }]}
        detail={
          <List.Item.Detail
            markdown={`# ${resultItem.text}${resultItem.imageUrl ? `\n\n![${resultItem.text}](${resultItem.imageUrl})` : ""}${resultItem.comment ? `\n\n*${resultItem.comment}*` : ""}\n\n${formatDefinitionsMarkdown(resultItem.definitions)}`}
          />
        }
        actions={
          <ActionPanel>
            {resultItem.id && (
              <Action.Push
                icon={Icon.Pencil}
                title="Edit"
                target={
                  <LearningItemForm
                    authIdentity={authIdentity}
                    existingItem={{
                      id: resultItem.id,
                      text: resultItem.text,
                      comment: resultItem.comment ?? undefined,
                      imageUrl: resultItem.imageUrl ?? undefined,
                      speechUrl: resultItem.speechUrl ?? undefined,
                      definitions: resultItem.definitions,
                      groupIds: resultItem.groupIds,
                    }}
                    currentLanguage={currentLanguage}
                    nativeLanguage={nativeLanguage}
                  />
                }
              />
            )}
            <Action
              icon={Icon.SpeakerHigh}
              title="Play Speech"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => playSpeech(resultItem.text, resultItem.speechUrl ?? undefined)}
            />
            {!hasDefinitions && lookupResult.suggestedDefinitions && resultItem.id && (
              <Action
                icon={lookupResult.suggestedDefinitions.source === "ai" ? Icon.Stars : Icon.Plus}
                title={`Add ${lookupResult.suggestedDefinitions.source === "ai" ? "AI" : "Blueprint"} Definitions`}
                onAction={() => updateWithDefinitions(resultItem.id!, lookupResult.suggestedDefinitions!.definitions)}
              />
            )}
            {canTriggerAi && (
              <Action
                icon={Icon.Stars}
                title="Get AI Definitions"
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onAction={triggerAi}
              />
            )}
            <CurrentLanguageActions {...languageActions} />
            {signOutAction}
            <Action
              icon={Icon.Sidebar}
              title={showingDetail ? "Hide Details" : "Show Details"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowingDetail(!showingDetail)}
            />
          </ActionPanel>
        }
      />,
    );
  }

  if (resultItem && lookupResult?.source === "blueprint") {
    items.push(
      <List.Item
        key={`blueprint-${resultItem.text}`}
        icon={Icon.Book}
        title={resultItem.text}
        subtitle={resultItem.definitions[0]?.definition ?? "No definition"}
        accessories={[{ tag: { value: "Blueprint", color: "#2196F3" } }]}
        detail={
          <List.Item.Detail
            markdown={`# ${resultItem.text}${resultItem.imageUrl ? `\n\n![${resultItem.text}](${resultItem.imageUrl})` : ""}${resultItem.comment ? `\n\n*${resultItem.comment}*` : ""}\n\n${formatDefinitionsMarkdown(resultItem.definitions)}`}
          />
        }
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Plus}
              title="Add with Definitions"
              onAction={() => addWithDefinitions(resultItem.text, resultItem.definitions)}
            />
            <Action
              icon={Icon.SpeakerHigh}
              title="Play Speech"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => playSpeech(resultItem.text, resultItem.speechUrl ?? undefined)}
            />
            <Action icon={Icon.Document} title="Add Text Only" onAction={() => addTextOnly(resultItem.text)} />
            <Action.Push
              icon={Icon.Pencil}
              title="Edit & Add"
              target={
                <LearningItemForm
                  authIdentity={authIdentity}
                  currentLanguage={currentLanguage}
                  initialValues={{
                    text: resultItem.text,
                    definitions: resultItem.definitions,
                  }}
                />
              }
            />
            <CurrentLanguageActions {...languageActions} />
            {signOutAction}
            <Action
              icon={Icon.Sidebar}
              title={showingDetail ? "Hide Details" : "Show Details"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowingDetail(!showingDetail)}
            />
          </ActionPanel>
        }
      />,
    );
  }

  if (resultItem && lookupResult?.source === "ai") {
    items.push(
      <List.Item
        key="ai-suggestion"
        icon={Icon.Stars}
        title={resultItem.text}
        subtitle={resultItem.definitions[0]?.definition ?? "No definition"}
        accessories={[{ tag: { value: "AI", color: "#9C27B0" } }]}
        detail={
          <List.Item.Detail
            markdown={`# ${resultItem.text}${resultItem.comment ? `\n\n*${resultItem.comment}*` : ""}\n\n${formatDefinitionsMarkdown(resultItem.definitions)}`}
          />
        }
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Plus}
              title="Add with Definitions"
              onAction={() => addWithDefinitions(resultItem.text, resultItem.definitions)}
            />
            <Action
              icon={Icon.SpeakerHigh}
              title="Play Speech"
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => playSpeech(resultItem.text)}
            />
            <Action icon={Icon.Document} title="Add Text Only" onAction={() => addTextOnly(resultItem.text)} />
            <Action.Push
              icon={Icon.Pencil}
              title="Edit & Add"
              target={
                <LearningItemForm
                  authIdentity={authIdentity}
                  currentLanguage={currentLanguage}
                  initialValues={{
                    text: resultItem.text,
                    comment: resultItem.comment ?? undefined,
                    definitions: resultItem.definitions,
                  }}
                />
              }
            />
            <CurrentLanguageActions {...languageActions} />
            {signOutAction}
            <Action
              icon={Icon.Sidebar}
              title={showingDetail ? "Hide Details" : "Show Details"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowingDetail(!showingDetail)}
            />
          </ActionPanel>
        }
      />,
    );
  }

  if (canTriggerAi && !isExisting) {
    items.push(
      <List.Item
        key="ai-lookup"
        icon={Icon.Stars}
        title={`AI Definitions for "${searchText}"`}
        detail={
          <List.Item.Detail
            markdown={`# AI Definitions\n\nUse AI to automatically generate definitions, translations, and examples for **"${searchText}"**.`}
          />
        }
        actions={
          <ActionPanel>
            <Action icon={Icon.Stars} title="Get AI Definitions" onAction={triggerAi} />
            <CurrentLanguageActions {...languageActions} />
            {signOutAction}
          </ActionPanel>
        }
      />,
    );
  }

  if (searchText.length >= 2 && !isExisting) {
    items.push(
      <List.Item
        key="add-new"
        icon={Icon.PlusCircle}
        title={`Add "${searchText}"`}
        detail={
          <List.Item.Detail
            markdown={`# Add Manually\n\nAdd **"${searchText}"** to your vocabulary. You can save it as text only or fill in definitions, translations, and examples yourself.`}
          />
        }
        actions={
          <ActionPanel>
            <Action icon={Icon.Document} title="Add Text Only" onAction={() => addTextOnly(searchText)} />
            <Action.Push
              icon={Icon.Pencil}
              title="Edit & Add"
              target={
                <LearningItemForm
                  authIdentity={authIdentity}
                  currentLanguage={currentLanguage}
                  initialValues={{ text: searchText }}
                />
              }
            />
            <CurrentLanguageActions {...languageActions} />
            {signOutAction}
            <Action
              icon={Icon.Sidebar}
              title={showingDetail ? "Hide Details" : "Show Details"}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setShowingDetail(!showingDetail)}
            />
          </ActionPanel>
        }
      />,
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search word to lookup..."
      onSearchTextChange={setSearchText}
      throttle
      isShowingDetail={showingDetail && items.length > 0}
    >
      {items.length === 0 && searchText.length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search"
          description="Enter at least 2 characters to lookup a word"
          actions={
            currentLanguage ? (
              <ActionPanel>
                <CurrentLanguageActions {...languageActions} />
                {signOutAction}
              </ActionPanel>
            ) : undefined
          }
        />
      ) : items.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Searching..."
          actions={
            currentLanguage ? (
              <ActionPanel>
                <CurrentLanguageActions {...languageActions} />
                {signOutAction}
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        items
      )}
    </List>
  );
}

export default function LookupWord() {
  return <CommandShell>{(context) => <LookupWordContent {...context} />}</CommandShell>;
}
