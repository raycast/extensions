import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
} from "@raycast/api";
import { useState } from "react";

import {
  AddTagForm,
  exportToSupportPath,
  ImportForm,
  openTextReplacementSettings,
  selectedAddTagTitle,
  TagColorsForm,
  tagAccessories,
  uniqueTags,
  useTagColors,
  useTextReplacements,
} from "./command-utils";
import { exportReplacementsToJson } from "./lib/import-export";
import {
  addTagsToReplacements,
  cloneReplacement,
  createReplacement,
  deleteReplacement,
  updateReplacement,
} from "./lib/operations";
import { replacementListRow } from "./lib/replacement-list-row";
import {
  clearReplacementSelection,
  selectAllReplacementIds,
  toggleReplacementSelection,
} from "./lib/selection";
import type { TagColorsByTag } from "./lib/tag-colors";
import type { TextReplacement } from "./lib/types";
import { ReplacementForm } from "./replacement-form";

export default function Command() {
  const { replacements, isLoading, error, reload, persist } =
    useTextReplacements();
  const { tagColors, persistTagColors } = useTagColors(replacements);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedReplacementIds, setSelectedReplacementIds] = useState<
    string[]
  >([]);
  const selectedReplacementCount = selectedReplacementIds.length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Text Replacements and tags"
      navigationTitle={
        isSelecting
          ? `${selectedReplacementCount} Selected`
          : "Text Replacement Manager"
      }
      actions={
        <GlobalActions
          replacements={replacements}
          tagColors={tagColors}
          isSelecting={isSelecting}
          selectedReplacementIds={selectedReplacementIds}
          onStartSelecting={() => setIsSelecting(true)}
          onSelectAll={() =>
            setSelectedReplacementIds(selectAllReplacementIds(replacements))
          }
          onClearSelection={() =>
            setSelectedReplacementIds(clearReplacementSelection())
          }
          onStopSelecting={() => {
            setIsSelecting(false);
            setSelectedReplacementIds(clearReplacementSelection());
          }}
          onReload={reload}
          onPersist={persist}
          onPersistTagColors={persistTagColors}
        />
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Unable to Read Text Replacements"
          description={error}
        />
      ) : replacements.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Text}
          title="No Text Replacements Found"
          description="Create one from Raycast or import a JSON file."
          actions={
            <GlobalActions
              replacements={replacements}
              tagColors={tagColors}
              isSelecting={isSelecting}
              selectedReplacementIds={selectedReplacementIds}
              onStartSelecting={() => setIsSelecting(true)}
              onSelectAll={() =>
                setSelectedReplacementIds(selectAllReplacementIds(replacements))
              }
              onClearSelection={() =>
                setSelectedReplacementIds(clearReplacementSelection())
              }
              onStopSelecting={() => {
                setIsSelecting(false);
                setSelectedReplacementIds(clearReplacementSelection());
              }}
              onReload={reload}
              onPersist={persist}
              onPersistTagColors={persistTagColors}
            />
          }
        />
      ) : (
        replacements.map((replacement) => (
          <ReplacementItem
            key={replacement.uuid}
            replacement={replacement}
            replacements={replacements}
            tagColors={tagColors}
            isSelecting={isSelecting}
            isSelected={selectedReplacementIds.includes(replacement.uuid)}
            selectedReplacementIds={selectedReplacementIds}
            onToggleSelection={(uuid) =>
              setSelectedReplacementIds((current) =>
                toggleReplacementSelection(current, uuid),
              )
            }
            onStartSelecting={() => {
              setIsSelecting(true);
              setSelectedReplacementIds([replacement.uuid]);
            }}
            onSelectAll={() =>
              setSelectedReplacementIds(selectAllReplacementIds(replacements))
            }
            onClearSelection={() =>
              setSelectedReplacementIds(clearReplacementSelection())
            }
            onStopSelecting={() => {
              setIsSelecting(false);
              setSelectedReplacementIds(clearReplacementSelection());
            }}
            onPersist={persist}
            onPersistTagColors={persistTagColors}
          />
        ))
      )}
    </List>
  );
}

function ReplacementItem(props: {
  replacement: TextReplacement;
  replacements: TextReplacement[];
  tagColors: TagColorsByTag;
  isSelecting: boolean;
  isSelected: boolean;
  selectedReplacementIds: string[];
  onToggleSelection(uuid: string): void;
  onStartSelecting(): void;
  onSelectAll(): void;
  onClearSelection(): void;
  onStopSelecting(): void;
  onPersist(next: TextReplacement[], title: string): Promise<void>;
  onPersistTagColors(next: TagColorsByTag, tags?: string[]): Promise<void>;
}) {
  const {
    replacement,
    replacements,
    tagColors,
    isSelecting,
    isSelected,
    selectedReplacementIds,
    onToggleSelection,
    onStartSelecting,
    onSelectAll,
    onClearSelection,
    onStopSelecting,
    onPersist,
    onPersistTagColors,
  } = props;
  const row = replacementListRow(replacement, tagColors);

  return (
    <List.Item
      icon={isSelecting ? selectionIcon(isSelected) : statusIcon(row.status)}
      title={{ value: row.trigger, tooltip: row.trigger }}
      subtitle={{ value: row.replacementText, tooltip: row.replacementText }}
      keywords={row.keywords}
      accessories={tagAccessories(row.tags)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isSelecting ? (
              <>
                <Action
                  icon={selectionIcon(isSelected)}
                  title={
                    isSelected ? "Deselect Replacement" : "Select Replacement"
                  }
                  shortcut={{ modifiers: [], key: "space" }}
                  onAction={() => onToggleSelection(replacement.uuid)}
                />
                {selectedReplacementIds.length ? (
                  <Action.Push
                    icon={Icon.Tag}
                    title={selectedAddTagTitle(selectedReplacementIds.length)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    target={
                      <AddTagForm
                        existingTags={uniqueTags(replacements)}
                        onSubmit={(tag) =>
                          onPersist(
                            addTagsToReplacements(
                              replacements,
                              selectedReplacementIds,
                              tag,
                            ),
                            "Adding tag to selected replacements",
                          )
                        }
                      />
                    }
                  />
                ) : null}
              </>
            ) : (
              <>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit Replacement"
                  target={
                    <ReplacementForm
                      title="Edit Text Replacement"
                      submitTitle="Save Replacement"
                      existing={replacements}
                      initialReplacement={replacement}
                      onSubmit={(input) =>
                        onPersist(
                          updateReplacement(
                            replacements,
                            replacement.uuid,
                            input,
                          ),
                          "Updating replacement",
                        )
                      }
                    />
                  }
                />
                <Action.Push
                  icon={Icon.Duplicate}
                  title="Clone Replacement"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <ReplacementForm
                      title="Clone Text Replacement"
                      submitTitle="Create Clone"
                      existing={replacements}
                      initialReplacement={{
                        ...replacement,
                        trigger: `${replacement.trigger}-copy`,
                      }}
                      forceCreate
                      onSubmit={(input) =>
                        onPersist(
                          cloneReplacement(
                            replacements,
                            replacement.uuid,
                            input,
                          ),
                          "Cloning replacement",
                        )
                      }
                    />
                  }
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Replacement"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Delete Text Replacement?",
                        message: `${replacement.trigger} -> ${replacement.replacementText}`,
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      })
                    ) {
                      await onPersist(
                        deleteReplacement(replacements, replacement.uuid),
                        "Deleting replacement",
                      );
                    }
                  }}
                />
              </>
            )}
          </ActionPanel.Section>
          {isSelecting ? null : (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Trigger"
                content={replacement.trigger}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Replacement Text"
                content={replacement.replacementText}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Replacement JSON"
                content={exportReplacementsToJson([replacement], tagColors)}
              />
              <Action
                icon={Icon.Download}
                title="Export Selected JSON"
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={() =>
                  exportToSupportPath(
                    [replacement],
                    `text-replacement-${replacement.trigger}.json`,
                    tagColors,
                  )
                }
              />
            </ActionPanel.Section>
          )}
          <GlobalActionSections
            replacements={replacements}
            tagColors={tagColors}
            isSelecting={isSelecting}
            selectedReplacementIds={selectedReplacementIds}
            onStartSelecting={onStartSelecting}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
            onStopSelecting={onStopSelecting}
            onPersist={onPersist}
            onPersistTagColors={onPersistTagColors}
          />
        </ActionPanel>
      }
    />
  );
}

function statusIcon(status: "enabled" | "disabled") {
  return status === "enabled"
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
}

function selectionIcon(isSelected: boolean) {
  return isSelected
    ? { source: Icon.CheckCircle, tintColor: Color.Blue }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function GlobalActions(props: {
  replacements: TextReplacement[];
  tagColors: TagColorsByTag;
  isSelecting: boolean;
  selectedReplacementIds: string[];
  onStartSelecting(): void;
  onSelectAll(): void;
  onClearSelection(): void;
  onStopSelecting(): void;
  onReload?: () => Promise<void>;
  onPersist(next: TextReplacement[], title: string): Promise<void>;
  onPersistTagColors(next: TagColorsByTag, tags?: string[]): Promise<void>;
}) {
  return (
    <ActionPanel>
      <GlobalActionSections {...props} showExportAllShortcut />
    </ActionPanel>
  );
}

function GlobalActionSections(props: {
  replacements: TextReplacement[];
  tagColors: TagColorsByTag;
  isSelecting: boolean;
  selectedReplacementIds: string[];
  onStartSelecting(): void;
  onSelectAll(): void;
  onClearSelection(): void;
  onStopSelecting(): void;
  onReload?: () => Promise<void>;
  onPersist(next: TextReplacement[], title: string): Promise<void>;
  onPersistTagColors(next: TagColorsByTag, tags?: string[]): Promise<void>;
  showExportAllShortcut?: boolean;
}) {
  const {
    replacements,
    tagColors,
    isSelecting,
    selectedReplacementIds,
    onStartSelecting,
    onSelectAll,
    onClearSelection,
    onStopSelecting,
    onReload,
    onPersist,
    onPersistTagColors,
    showExportAllShortcut,
  } = props;
  const existingTags = uniqueTags(replacements);

  return (
    <>
      <ActionPanel.Section>
        {isSelecting ? (
          <>
            {selectedReplacementIds.length ? (
              <Action.Push
                icon={Icon.Tag}
                title={selectedAddTagTitle(selectedReplacementIds.length)}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={
                  <AddTagForm
                    existingTags={existingTags}
                    onSubmit={(tag) =>
                      onPersist(
                        addTagsToReplacements(
                          replacements,
                          selectedReplacementIds,
                          tag,
                        ),
                        "Adding tag to selected replacements",
                      )
                    }
                  />
                }
              />
            ) : null}
            <Action
              icon={Icon.CheckCircle}
              title="Select All Replacements"
              shortcut={{ modifiers: [], key: "a" }}
              onAction={onSelectAll}
            />
            <Action
              icon={Icon.XMarkCircle}
              title="Clear Selection"
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={onClearSelection}
            />
            <Action
              icon={Icon.ArrowLeft}
              title="Done Selecting"
              shortcut={{ modifiers: ["cmd"], key: "escape" }}
              onAction={onStopSelecting}
            />
          </>
        ) : (
          <Action
            icon={Icon.CheckCircle}
            title="Select Multiple Replacements"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={onStartSelecting}
          />
        )}
      </ActionPanel.Section>
      {!isSelecting ? (
        <ActionPanel.Section>
          <Action.Push
            icon={Icon.Plus}
            title="Create Text Replacement"
            target={
              <ReplacementForm
                title="Create Text Replacement"
                submitTitle="Create Replacement"
                existing={replacements}
                onSubmit={(input) =>
                  onPersist(
                    createReplacement(replacements, input),
                    "Creating replacement",
                  )
                }
              />
            }
          />
          <Action.Push
            icon={Icon.Circle}
            title="Set Tag Colors"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            target={
              <TagColorsForm
                tags={existingTags}
                tagColors={tagColors}
                onSubmit={onPersistTagColors}
              />
            }
          />
          <Action.Push
            icon={Icon.Upload}
            title="Import JSON"
            target={
              <ImportForm
                existing={replacements}
                onImport={async (imported, importedTagColors) => {
                  const next = [...replacements, ...imported];
                  await onPersist(next, "Importing replacements");
                  if (Object.keys(importedTagColors).length) {
                    await onPersistTagColors(
                      { ...tagColors, ...importedTagColors },
                      uniqueTags(next),
                    );
                  }
                }}
              />
            }
          />
          <Action
            icon={Icon.Download}
            title="Export All JSON"
            shortcut={
              showExportAllShortcut
                ? { modifiers: ["cmd"], key: "return" }
                : undefined
            }
            onAction={() =>
              exportToSupportPath(
                replacements,
                "text-replacements.json",
                tagColors,
              )
            }
          />
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        {onReload ? (
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload from macOS"
            onAction={onReload}
          />
        ) : null}
        <Action
          icon={Icon.Gear}
          title="Open macOS Text Replacement Settings"
          onAction={openTextReplacementSettings}
        />
      </ActionPanel.Section>
    </>
  );
}
