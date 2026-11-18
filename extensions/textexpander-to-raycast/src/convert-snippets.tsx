import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { convertLibrary } from "./lib/converter";
import { findLocalSettings, readLibraries, readRaycastExport } from "./lib/reader";
import { deleteProgress, loadProgress } from "./lib/session-storage";
import { SnippetPreview } from "./components/snippet-preview";
import { errorMessage } from "./components/shared";
import type { MigrationSession } from "./lib/types";

export default function Command() {
  const { push } = useNavigation();
  const [source, setSource] = useState("automatic");
  const [files, setFiles] = useState<string[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [sourceError, setSourceError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function preview(values: { prefixGroups: boolean; convertMacros: boolean }) {
    if (isLoading) return;
    if (source === "saved") {
      await resume();
      return;
    }
    if (source === "file" && !files.length) {
      setSourceError("Choose at least one TextExpander file or settings bundle.");
      return;
    }
    setSourceError(undefined);
    setIsLoading(true);
    try {
      const paths = source === "automatic" ? [await findLocalSettings()] : files;
      const { library, sources } = await readLibraries(paths);
      const referencePath = references[0];
      const existing = referencePath ? await readRaycastExport(referencePath) : [];
      const conversion = convertLibrary(library, values.prefixGroups, values.convertMacros);
      const session: MigrationSession = {
        version: 1,
        createdAt: new Date().toISOString(),
        prefixGroups: values.prefixGroups,
        sources,
        conversion,
        selectedIds: conversion.snippets.map((item) => item.id),
        edits: {},
        groupNames: {},
        existing,
        referencePath,
      };
      push(<SnippetPreview initialSession={session} />);
    } catch (error) {
      setSourceError(errorMessage(error));
      await showFailureToast(error, { title: "Could Not Read Migration Data" });
    } finally {
      setIsLoading(false);
    }
  }

  async function resume() {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const session = await loadProgress();
      if (session) push(<SnippetPreview initialSession={session} />);
      else
        await showToast({
          style: Toast.Style.Failure,
          title: "No Saved Migration",
          message: "Use Save Progress in the snippet preview first.",
        });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Resume Migration" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Convert TextExpander Snippets"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={source === "saved" ? "Resume Migration" : "Preview Snippets"}
            icon={Icon.Eye}
            onSubmit={preview}
          />
          <Action title="Resume Saved Migration" icon={Icon.Clock} onAction={resume} />
          <Action
            title="Delete Saved Progress"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              if (
                !(await confirmAlert({
                  title: "Delete Saved Progress?",
                  message: "Your saved edits, group names, and selection will be permanently deleted.",
                  primaryAction: { title: "Delete Progress", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              try {
                await deleteProgress();
                await showToast({ style: Toast.Style.Success, title: "Saved Progress Deleted" });
              } catch (error) {
                await showFailureToast(error, { title: "Could Not Delete Progress" });
              }
            }}
          />
          <Action.OpenInBrowser
            title="TextExpander Export Help"
            url="https://textexpander.com/learn/using/importing-and-exporting-snippet-groups"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Combine TextExpander sources, review and edit snippets, then save JSON for Raycast's Import Snippets command. All processing happens on your Mac." />
      <Form.Dropdown
        id="source"
        title="Source"
        value={source}
        error={source !== "file" ? sourceError : undefined}
        onChange={(value) => {
          setSource(value);
          setSourceError(undefined);
        }}
      >
        <Form.Dropdown.Item value="automatic" title="Find Local TextExpander Settings" />
        <Form.Dropdown.Item value="file" title="Choose Files or Settings Bundles" />
        <Form.Dropdown.Item value="saved" title="Resume Saved Migration" />
      </Form.Dropdown>
      {source === "file" && (
        <Form.FilePicker
          id="files"
          title="TextExpander Data"
          value={files}
          onChange={(value) => {
            setFiles(value);
            setSourceError(undefined);
          }}
          error={sourceError}
          allowMultipleSelection
          canChooseDirectories
          canChooseFiles
          info="Choose one or more CSVs, .textexpander files, XML group exports, or .textexpandersettings bundles."
        />
      )}
      {source === "saved" ? (
        <Form.Description text="Resume your saved local snapshot, including edits, group names, selection, and comparison snippets. Source files are not read again." />
      ) : (
        <>
          <Form.FilePicker
            id="reference"
            title="Existing Raycast Export"
            value={references}
            onChange={setReferences}
            allowMultipleSelection={false}
            canChooseDirectories={false}
            canChooseFiles
            info="Optional. Choose a JSON file from Raycast's Export Snippets command to check for keyword conflicts. Your live library is not accessed."
          />
          <Form.Checkbox
            id="prefixGroups"
            title="Snippet Names"
            label="Prefix names with the TextExpander group"
            defaultValue
            storeValue
          />
          <Form.Checkbox
            id="convertMacros"
            title="Macros"
            label="Convert supported clipboard, cursor, and date macros"
            defaultValue={false}
            info="Opt-in. Unsupported or ambiguous macros remain unchanged. Review original and converted text in the preview."
          />
        </>
      )}
      <Form.Separator />
      <Form.Description
        title="Conversion Notes"
        text="Suggested Snippets, empty snippets, and exact duplicates are excluded. Formatting and images are omitted. Scripts remain text. Save Progress in the preview to keep a local snapshot of source and comparison snippets, edits, and selection for later."
      />
    </Form>
  );
}
