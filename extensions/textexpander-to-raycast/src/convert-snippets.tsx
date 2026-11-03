import { Action, ActionPanel, Color, Detail, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { homedir } from "node:os";
import { join } from "node:path";
import { convertLibrary } from "./lib/converter";
import { exportSnippets, validateFilename } from "./lib/exporter";
import { findLocalSettings, readLibrary } from "./lib/reader";
import type { Conversion, PreviewSnippet, RaycastSnippet } from "./lib/types";

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if ("code" in error) {
      if (error.code === "EEXIST") return "A file with this name already exists. Choose a different filename.";
      if (error.code === "EACCES" || error.code === "EPERM") {
        return "Raycast cannot access this location. Choose a folder or file you can access.";
      }
      if (error.code === "ENOENT") return "The file or folder no longer exists. Choose another location.";
    }
    return error.message;
  }
  return "An unexpected error occurred.";
}

function textPreview(text: string): string {
  const longestRun = (text.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 2);
  const fence = "`".repeat(longestRun + 1);
  return `${fence}text\n${text}\n${fence}`;
}

export default function Command() {
  const { push } = useNavigation();
  const [source, setSource] = useState("automatic");
  const [files, setFiles] = useState<string[]>([]);
  const [sourceError, setSourceError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function preview(values: { prefixGroups: boolean }) {
    if (isLoading) return;
    if (source === "file" && !files[0]) {
      setSourceError("Choose a TextExpander file or settings bundle.");
      return;
    }
    setSourceError(undefined);
    setIsLoading(true);
    try {
      const sourcePath = source === "automatic" ? await findLocalSettings() : files[0];
      if (!sourcePath) return;
      const conversion = convertLibrary(await readLibrary(sourcePath), values.prefixGroups);
      push(<SnippetPreview conversion={conversion} sourcePath={sourcePath} />);
    } catch (error) {
      setSourceError(errorMessage(error));
      await showToast({ style: Toast.Style.Failure, title: "Could Not Read TextExpander Data" });
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
          <Action.SubmitForm title="Preview Snippets" icon={Icon.Eye} onSubmit={preview} />
          <Action.OpenInBrowser
            title="TextExpander Export Help"
            url="https://textexpander.com/learn/using/importing-and-exporting-snippet-groups"
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Convert your TextExpander library into a JSON file for Raycast's Import Snippets command. Review and select snippets before saving." />
      <Form.Dropdown
        id="source"
        title="Source"
        value={source}
        error={source === "automatic" ? sourceError : undefined}
        onChange={(value) => {
          setSource(value);
          setSourceError(undefined);
        }}
      >
        <Form.Dropdown.Item value="automatic" title="Find Local TextExpander Settings" />
        <Form.Dropdown.Item value="file" title="Choose a File or Settings Bundle" />
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
          allowMultipleSelection={false}
          canChooseDirectories
          canChooseFiles
          info="Choose a CSV export, a .textexpander file, an XML group export, or a .textexpandersettings bundle."
        />
      )}
      <Form.Checkbox
        id="prefixGroups"
        title="Snippet Names"
        label="Prefix names with the TextExpander group"
        defaultValue
        storeValue
      />
      <Form.Separator />
      <Form.Description
        title="Conversion Notes"
        text="Suggested Snippets and empty snippets are excluded. Rich text becomes plain text. Scripts and TextExpander macros remain text and are marked for review. All conversion happens on your Mac."
      />
    </Form>
  );
}

function SnippetPreview({ conversion, sourcePath }: { conversion: Conversion; sourcePath: string }) {
  const { push } = useNavigation();
  const [selected, setSelected] = useState(() => new Set(conversion.snippets.map((item) => item.id)));
  const [group, setGroup] = useState("");
  const groups = [...new Set(conversion.snippets.map((item) => item.group))].sort();
  const visible = conversion.snippets.filter((item) => !group || item.group === group);
  const skipped = [
    `${conversion.suggestedCount} suggested`,
    `${conversion.emptyCount} empty`,
    `${conversion.duplicateCount} duplicate`,
  ].join(", ");

  function toggle(item: PreviewSnippet) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function exportSelected() {
    const snippets = conversion.snippets.filter((item) => selected.has(item.id)).map((item) => item.snippet);
    if (!snippets.length) {
      void showToast({ style: Toast.Style.Failure, title: "Select at Least One Snippet" });
      return;
    }
    push(<ExportForm snippets={snippets} />);
  }

  function actions(item?: PreviewSnippet) {
    return (
      <ActionPanel>
        {item && (
          <Action
            title={selected.has(item.id) ? "Exclude Snippet" : "Include Snippet"}
            icon={selected.has(item.id) ? Icon.MinusCircle : Icon.PlusCircle}
            onAction={() => toggle(item)}
          />
        )}
        <Action
          title={`Export ${selected.size} Selected Snippets`}
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={exportSelected}
        />
        <Action
          title="Select All Snippets"
          icon={Icon.CheckCircle}
          onAction={() => setSelected(new Set(conversion.snippets.map((entry) => entry.id)))}
        />
        <Action title="Deselect All Snippets" icon={Icon.Circle} onAction={() => setSelected(new Set())} />
        {item && (
          <Action.CopyToClipboard
            title="Copy Converted Text"
            content={item.snippet.text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        )}
        <Action.Push
          title="View Conversion Summary"
          icon={Icon.Info}
          target={
            <Detail
              navigationTitle="Conversion Summary"
              markdown={`## Conversion summary\n\n- ${conversion.snippets.length} snippets available\n- ${conversion.suggestedCount} Suggested Snippets excluded\n- ${conversion.emptyCount} snippets without plain text excluded\n- ${conversion.duplicateCount} exact duplicates excluded\n- ${conversion.snippets.filter((entry) => entry.warnings.length > 0).length} snippets have review notes\n\nSelection includes all groups, even while a group filter is active. Keyword conflict notes describe the full conversion and do not check your existing Raycast snippets.\n\n### Source\n\n${textPreview(sourcePath)}`}
            />
          }
        />
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle="Preview Snippets"
      searchBarPlaceholder="Search names, keywords, or groups..."
      isShowingDetail
      actions={actions()}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Group" value={group} onChange={setGroup}>
          <List.Dropdown.Item title="All Groups" value="" />
          {groups.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={conversion.snippets.length ? "No Matching Snippets" : "No Snippets to Export"}
        description={
          conversion.snippets.length
            ? "Try another search or choose All Groups. Your selection is kept across filters."
            : `Excluded: ${skipped}. Choose another TextExpander source.`
        }
        icon={Icon.Document}
      />
      <List.Section
        title={`${selected.size} of ${conversion.snippets.length} selected`}
        subtitle={`${conversion.suggestedCount + conversion.emptyCount + conversion.duplicateCount} skipped`}
      >
        {visible.map((item) => (
          <List.Item
            key={item.id}
            title={item.snippet.name}
            subtitle={item.snippet.keyword}
            keywords={[item.group, item.snippet.keyword ?? ""]}
            icon={{
              source: selected.has(item.id) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selected.has(item.id) ? Color.Green : Color.SecondaryText,
            }}
            accessories={
              item.warnings.length
                ? [{ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: item.warnings.join("\n") }]
                : []
            }
            detail={
              <List.Item.Detail
                markdown={`${item.warnings.length ? item.warnings.map((warning) => `> ${warning}`).join("\n\n") + "\n\n" : ""}${textPreview(item.snippet.text)}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Group" text={item.group} />
                    <List.Item.Detail.Metadata.Label title="Keyword" text={item.snippet.keyword || "None"} />
                    <List.Item.Detail.Metadata.Label title="Source Type" text={item.kind} />
                    <List.Item.Detail.Metadata.Label
                      title="Export"
                      text={selected.has(item.id) ? "Included" : "Excluded"}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions(item)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ExportForm({ snippets }: { snippets: RaycastSnippet[] }) {
  const { push } = useNavigation();
  const [directories, setDirectories] = useState([join(homedir(), "Downloads")]);
  const [filename, setFilename] = useState(`snippets-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}.json`);
  const [directoryError, setDirectoryError] = useState<string>();
  const [filenameError, setFilenameError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function save() {
    if (isLoading) return;
    const directory = directories[0];
    const invalidFilename = validateFilename(filename);
    setDirectoryError(directory ? undefined : "Choose an output folder.");
    setFilenameError(invalidFilename);
    if (!directory || invalidFilename) return;
    setIsLoading(true);
    try {
      const filePath = await exportSnippets({ directory, filename, snippets });
      await showToast({ style: Toast.Style.Success, title: `Exported ${snippets.length} Snippets` });
      push(<ExportComplete filePath={filePath} count={snippets.length} />);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Save Snippets", message: errorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Export Snippets"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save JSON File" icon={Icon.Download} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Save ${snippets.length} selected snippets, then run Raycast's Import Snippets command and select this JSON file.`}
      />
      <Form.FilePicker
        id="directory"
        title="Save To"
        value={directories}
        onChange={(value) => {
          setDirectories(value);
          setDirectoryError(undefined);
        }}
        error={directoryError}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        value={filename}
        onChange={(value) => {
          setFilename(value);
          setFilenameError(undefined);
        }}
        error={filenameError}
      />
    </Form>
  );
}

function ExportComplete({ filePath, count }: { filePath: string; count: number }) {
  return (
    <Detail
      navigationTitle="Snippets Exported"
      markdown={`## ${count} snippets exported\n\n1. Run **Import Snippets** in Raycast.\n2. Select the saved JSON file. Use **Copy File Path**, then press **⌘⇧G** in the file picker to paste it.\n3. Complete the import in Raycast.\n\n### Saved file\n\n${textPreview(filePath)}`}
      actions={
        <ActionPanel>
          <Action.ShowInFinder title="Show Exported File in Finder" path={filePath} />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={filePath}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser title="Raycast Snippet Import Help" url="https://manual.raycast.com/snippets" />
        </ActionPanel>
      }
    />
  );
}
