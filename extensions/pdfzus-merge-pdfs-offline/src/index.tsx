import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  open,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  defaultOutputName,
  formatFileSize,
  normalizeOutputName,
  resolveOutputPath,
  revealInFinder,
  SelectedPdfFile,
  toSelectedPdfFiles,
} from "./lib/file-utils";
import { mergePdfFiles } from "./lib/merge-pdfs";

type PickFilesFormValues = {
  files: string[];
};

type SaveMergedPdfFormValues = {
  outputName: string;
  outputDirectory: string[];
};

export default function Command() {
  const { push } = useNavigation();

  const handleSubmit = async (values: PickFilesFormValues) => {
    const files = toSelectedPdfFiles(values.files);

    if (files.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid PDF files selected",
        message: "Choose at least one existing PDF file to continue.",
      });
      return false;
    }

    push(<ArrangeFilesScreen initialFiles={files} />);
    return true;
  };

  return (
    <Form
      navigationTitle="Merge PDFs"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.ArrowRight} title="Arrange PDFs" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="PDF Files" info="Choose the PDF files you want to merge." />
      <Form.Description
        title="Privacy"
        text="All processing happens locally in Raycast. Your PDF files are never uploaded to a server."
      />
    </Form>
  );
}

function ArrangeFilesScreen(props: { initialFiles: SelectedPdfFile[] }) {
  const { initialFiles } = props;
  const { pop } = useNavigation();
  const [files, setFiles] = useState(initialFiles);

  const moveFile = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) {
      return;
    }

    setFiles((currentFiles) => {
      const nextFiles = [...currentFiles];
      const [currentFile] = nextFiles.splice(index, 1);
      nextFiles.splice(nextIndex, 0, currentFile);
      return nextFiles;
    });
  };

  const removeFile = async (fileId: string) => {
    const nextFiles = files.filter((file) => file.id !== fileId);
    if (nextFiles.length === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Selection cleared",
        message: "Pick new files to continue.",
      });
      pop();
      return;
    }

    setFiles(nextFiles);
  };

  return (
    <List
      isShowingDetail
      filtering={false}
      navigationTitle="Arrange PDFs"
      searchBarPlaceholder="Review the order of your PDF files"
    >
      {files.map((file, index) => (
        <List.Item
          key={file.id}
          title={file.name}
          subtitle={`${index + 1}. ${path.dirname(file.path)}`}
          accessories={[{ text: formatFileSize(file.sizeInBytes) }]}
          detail={
            <List.Item.Detail
              markdown={[
                `# ${file.name}`,
                "",
                `- **Position:** ${index + 1}`,
                `- **Size:** ${formatFileSize(file.sizeInBytes)}`,
                `- **Path:** \`${file.path}\``,
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Download}
                title="Continue to Export"
                target={<SaveMergedPdfScreen files={files} />}
              />
              <Action icon={Icon.ArrowUp} title="Move Earlier" onAction={() => moveFile(index, -1)} />
              <Action icon={Icon.ArrowDown} title="Move Later" onAction={() => moveFile(index, 1)} />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Remove File"
                onAction={() => removeFile(file.id)}
              />
              <Action.Open title="Open PDF" target={file.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SaveMergedPdfScreen(props: { files: SelectedPdfFile[] }) {
  const { files } = props;
  const { push } = useNavigation();

  const handleSubmit = async (values: SaveMergedPdfFormValues) => {
    const outputDirectory = values.outputDirectory?.[0];
    if (!outputDirectory) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing output folder",
        message: "Choose a folder to save the merged PDF.",
      });
      return false;
    }

    try {
      const outputName = normalizeOutputName(values.outputName);
      const outputPath = resolveOutputPath(outputDirectory, outputName);

      await showToast({
        style: Toast.Style.Animated,
        title: "Merging PDFs",
        message: "Writing the merged file locally.",
      });

      const mergedBytes = await mergePdfFiles(files.map((file) => file.path));
      await writeFile(outputPath, mergedBytes);

      await showToast({
        style: Toast.Style.Success,
        title: "Merged PDF saved",
        message: path.basename(outputPath),
      });

      push(<MergeResultScreen outputPath={outputPath} files={files} />);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Merge failed",
        message,
      });
      return false;
    }
  };

  return (
    <Form
      navigationTitle="Export Merged PDF"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Document} title="Merge PDFs" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="outputName"
        title="Output File Name"
        placeholder="merged-pdfzus.pdf"
        defaultValue={defaultOutputName(files)}
      />
      <Form.FilePicker
        id="outputDirectory"
        title="Output Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={[path.dirname(files[0]?.path ?? process.cwd())]}
      />
      <Form.Description
        title="Result"
        text="Existing files are protected. Choose a new name if the target file already exists."
      />
    </Form>
  );
}

function MergeResultScreen(props: { outputPath: string; files: SelectedPdfFile[] }) {
  const { outputPath, files } = props;
  const outputName = path.basename(outputPath);
  const outputFolder = path.dirname(outputPath);

  const markdown = [
    `# ${outputName}`,
    "",
    "The merged PDF was written locally.",
    "",
    `- **Location:** \`${outputPath}\``,
    `- **Merged files:** ${files.length}`,
    "",
    "Use the actions to open the PDF, reveal it in Finder, or copy its path.",
  ].join("\n");

  return (
    <Detail
      navigationTitle="Merge Complete"
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Open title="Open Merged PDF" target={outputPath} icon={Icon.Document} />
          <Action title="Show in Finder" icon={Icon.Finder} onAction={() => revealInFinder(outputPath)} />
          <Action title="Open Output Folder" icon={Icon.Folder} onAction={() => open(outputFolder)} />
          <Action title="Copy Output Path" icon={Icon.Clipboard} onAction={() => Clipboard.copy(outputPath)} />
          <Action title="Start New Merge" icon={Icon.RotateAntiClockwise} onAction={popToRoot} />
        </ActionPanel>
      }
    />
  );
}
