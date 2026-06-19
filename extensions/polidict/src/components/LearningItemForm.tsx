import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { BadRequestError, createApiClient } from "../api";
import { useGroups, useUserProfile } from "../hooks";
import {
  invalidateLearningItemsCache,
  invalidateLookupCache,
  invalidateUserProfileCache,
} from "../features/shared/query-keys";
import { canAccessAI, getAISuggestion } from "../services/ai-suggestion-service";
import { FIELD_LIMITS } from "../constants";
import { DefinitionsManager } from "./DefinitionsManager";
import { GroupPicker } from "./GroupPicker";
import { ImagePicker } from "./ImagePicker";
import type { ItemDefinition, LearningItem, SupportedLanguage, UnsavedLearningItem } from "../types";
import { formatRaycastError, normalizeText } from "../utils";

interface LearningItemFormProps {
  currentLanguage: SupportedLanguage;
  authIdentity: string;
  nativeLanguage?: SupportedLanguage;
  initialValues?: Partial<LearningItem>;
  existingItem?: LearningItem;
  onSuccess?: (item: LearningItem) => void;
}

export function LearningItemForm({
  currentLanguage,
  authIdentity,
  nativeLanguage,
  initialValues,
  existingItem,
  onSuccess,
}: LearningItemFormProps) {
  const { pop, push } = useNavigation();
  const { isPlusUser, canAddLearningItems } = useUserProfile(authIdentity);
  const { data: availableGroups = [] } = useGroups(currentLanguage, authIdentity, { pageSize: 100 });

  const [text, setText] = useState(initialValues?.text ?? existingItem?.text ?? "");
  const [comment, setComment] = useState(initialValues?.comment ?? existingItem?.comment ?? "");
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    initialValues?.groupIds ?? existingItem?.groupIds ?? [],
  );
  const [definitions, setDefinitions] = useState<ItemDefinition[]>(
    initialValues?.definitions ?? existingItem?.definitions ?? [],
  );
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialValues?.imageUrl ?? existingItem?.imageUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const languageCode = currentLanguage.languageCode;
  const hasAIAccess = canAccessAI(isPlusUser);

  function invalidateRelatedCaches() {
    invalidateLearningItemsCache(authIdentity, languageCode);
    invalidateLookupCache(authIdentity, languageCode);
    invalidateUserProfileCache(authIdentity);
  }

  async function handleFillWithAI() {
    if (!text.trim() || text.length < 2) {
      showToast({
        style: Toast.Style.Failure,
        title: "Enter at least 2 characters",
      });
      return;
    }

    setIsLoadingAI(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Getting AI suggestions...",
    });

    try {
      const result = await getAISuggestion(text, currentLanguage, nativeLanguage, { isPlusUser, availableGroups });

      if (result?.suggestion) {
        const suggestion = result.suggestion;

        if (suggestion.definitions?.length) {
          setDefinitions(
            suggestion.definitions.map((def) => ({
              definition: def.definition,
              translation: def.translation,
              examples: def.examples,
            })),
          );
        }

        if (suggestion.groupIds?.length) {
          const validGroupIds = new Set(availableGroups.map((g) => g.id));
          const filteredGroups = suggestion.groupIds.filter((id) => validGroupIds.has(id));
          if (filteredGroups.length > 0) {
            setSelectedGroups(filteredGroups);
          }
        }

        toast.style = Toast.Style.Success;
        toast.title = `Filled with AI (${result.source === "raycast" ? "Raycast" : "Polidict"})`;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "No suggestions available";
      }
    } catch (error) {
      const userError = formatRaycastError(error);
      toast.style = Toast.Style.Failure;
      toast.title = userError.title;
      toast.message = userError.description;
    } finally {
      setIsLoadingAI(false);
    }
  }

  async function handleConflict(existingId: string, unsaved: UnsavedLearningItem): Promise<LearningItem | undefined> {
    const client = createApiClient();

    const action = await confirmAlert({
      title: "Item Already Exists",
      message: `"${text}" already exists in your vocabulary. What would you like to do?`,
      primaryAction: {
        title: "Override",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Keep Existing",
      },
    });

    if (!action) {
      return undefined;
    }

    try {
      const existingItem = await client.learningItems.getLearningItem(languageCode, existingId);

      const mergedGroupIds = Array.from(new Set([...(existingItem.groupIds ?? []), ...(unsaved.groupIds ?? [])]));

      const updated = await client.learningItems.updateLearningItem(languageCode, {
        ...unsaved,
        id: existingId,
        groupIds: mergedGroupIds.length ? mergedGroupIds : undefined,
        speechUrl: existingItem.speechUrl,
      });

      invalidateRelatedCaches();
      return updated;
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
      return undefined;
    }
  }

  async function handleSubmit() {
    if (!text.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Text is required" });
      return;
    }

    if (!existingItem && !canAddLearningItems) {
      showToast({
        style: Toast.Style.Failure,
        title: "Limit Reached",
        message: "You have reached the maximum number of learning items. Upgrade to Polidict Plus for unlimited items.",
      });
      return;
    }

    setIsSubmitting(true);
    const normalizedText = normalizeText(text);

    try {
      const client = createApiClient();

      if (existingItem) {
        const updated = await client.learningItems.updateLearningItem(languageCode, {
          ...existingItem,
          text: normalizedText,
          comment: comment || undefined,
          definitions: definitions.length ? definitions : undefined,
          groupIds: selectedGroups.length ? selectedGroups : undefined,
          imageUrl: imageUrl || undefined,
        });
        showToast({
          style: Toast.Style.Success,
          title: "Updated successfully",
        });
        invalidateRelatedCaches();
        onSuccess?.(updated);
        pop();
      } else {
        const unsaved: UnsavedLearningItem = {
          text: normalizedText,
          comment: comment || undefined,
          definitions: definitions.length ? definitions : undefined,
          groupIds: selectedGroups.length ? selectedGroups : undefined,
          imageUrl: imageUrl || undefined,
        };

        try {
          const created = await client.learningItems.addLearningItem(languageCode, unsaved);
          showToast({
            style: Toast.Style.Success,
            title: "Added successfully",
          });
          invalidateRelatedCaches();
          onSuccess?.(created);
          pop();
        } catch (error) {
          if (error instanceof BadRequestError && error.isLearningItemConflict()) {
            const existingId = error.errorDetails?.existingId;
            if (!existingId) {
              throw error;
            }
            const result = await handleConflict(existingId, unsaved);
            if (result) {
              showToast({
                style: Toast.Style.Success,
                title: "Updated existing item",
              });
              onSuccess?.(result);
              pop();
            } else {
              showToast({
                style: Toast.Style.Success,
                title: "Kept existing item",
              });
              pop();
            }
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      const userError = formatRaycastError(error);
      showToast({
        style: Toast.Style.Failure,
        title: userError.title,
        message: userError.description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting || isLoadingAI}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={existingItem ? "Update" : "Add"} onSubmit={handleSubmit} />
          {hasAIAccess && text.length >= 2 && (
            <Action
              title="Fill with AI"
              icon={Icon.Stars}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={handleFillWithAI}
            />
          )}
          <Action
            title="Select Groups"
            icon={Icon.Tag}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={() =>
              push(
                <GroupPicker
                  currentLanguage={currentLanguage}
                  selectedGroupIds={selectedGroups}
                  onSelect={setSelectedGroups}
                />,
              )
            }
          />
          <Action
            title="Manage Definitions"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() =>
              push(
                <DefinitionsManager
                  definitions={definitions}
                  onChange={setDefinitions}
                  text={text}
                  currentLanguage={currentLanguage}
                  hasAIAccess={hasAIAccess}
                />,
              )
            }
          />
          {text.length >= 2 && (
            <Action
              title="Search Image"
              icon={Icon.Image}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={() => push(<ImagePicker initialSearchText={text} onSelect={setImageUrl} />)}
            />
          )}
          {imageUrl && (
            <Action
              title="Remove Image"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              onAction={() => setImageUrl(undefined)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Text"
        placeholder="Enter word or phrase"
        value={text}
        onChange={setText}
        autoFocus={!existingItem}
        error={text.length > FIELD_LIMITS.TEXT_MAX ? `Max ${FIELD_LIMITS.TEXT_MAX} characters` : undefined}
      />

      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Optional comment"
        value={comment}
        onChange={setComment}
        error={comment.length > FIELD_LIMITS.COMMENT_MAX ? `Max ${FIELD_LIMITS.COMMENT_MAX} characters` : undefined}
      />

      <Form.Separator />

      <Form.Description
        title="Groups"
        text={
          selectedGroups.length
            ? `${selectedGroups.length} group${selectedGroups.length === 1 ? "" : "s"} selected — Press ⌘G to change`
            : "No groups — Press ⌘G to select"
        }
      />

      <Form.Description
        title="Definitions"
        text={
          definitions.length
            ? `${definitions.length} definition${definitions.length === 1 ? "" : "s"} — Press ⌘D to manage`
            : "No definitions — Press ⌘D to add"
        }
      />

      <Form.Description
        title="Image"
        text={
          imageUrl
            ? `✓ ${imageUrl.length > 50 ? imageUrl.slice(0, 50) + "..." : imageUrl} — Press ⌘⇧I to remove`
            : text.length >= 2
              ? "No image — Press ⌘I to search"
              : "Enter text to search for images"
        }
      />
    </Form>
  );
}
