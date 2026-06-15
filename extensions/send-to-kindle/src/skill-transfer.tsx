import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import path from "path";
import {
  addFilter,
  DomainFilter,
  exportFiltersToPath,
  exportFilterToPath,
  importFiltersFromPath,
  importFilterFromPath,
} from "./filters";

type FilterDraft = Pick<DomainFilter, "domain" | "selector" | "coverSelector">;

type ImportSkillFormProps = {
  onImported: (filter: FilterDraft) => void;
};

type ImportAllSkillsFormProps = {
  onImported: (count: number) => void;
};

type ExportSkillFormProps = {
  filter: FilterDraft;
};

type ExportAllSkillsFormProps = {
  filters: FilterDraft[];
};

type ImportSkillFormValues = {
  files: string[];
};

type ExportSkillFormValues = {
  directory: string[];
  fileName: string;
};

type ExportAllSkillsFormValues = ExportSkillFormValues;

export function ImportSkillForm({ onImported }: ImportSkillFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ImportSkillFormValues) {
    const filePath = values.files[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing file",
        message: "Select a JSON file to import.",
      });
      return;
    }

    try {
      const imported = await importFilterFromPath(filePath);
      onImported(imported);
      await showToast({
        style: Toast.Style.Success,
        title: "Skill imported",
      });
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message,
      });
    }
  }

  return (
    <Form
      navigationTitle="Import Skill JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Skill" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="JSON file" allowMultipleSelection={false} canChooseDirectories={false} />
    </Form>
  );
}

export function ImportAllSkillsForm({ onImported }: ImportAllSkillsFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ImportSkillFormValues) {
    const filePath = values.files[0];
    if (!filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing file",
        message: "Select a JSON file to import.",
      });
      return;
    }

    try {
      const imported = await importFiltersFromPath(filePath);
      for (const filter of imported) {
        await addFilter(filter.domain, filter.selector, filter.coverSelector);
      }

      onImported(imported.length);
      await showToast({
        style: Toast.Style.Success,
        title: "Skills imported",
        message: `${imported.length} skill${imported.length === 1 ? "" : "s"} imported.`,
      });
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message,
      });
    }
  }

  return (
    <Form
      navigationTitle="Import All Skills JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import All Skills" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="JSON file" allowMultipleSelection={false} canChooseDirectories={false} />
    </Form>
  );
}

export function ExportSkillForm({ filter }: ExportSkillFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ExportSkillFormValues) {
    const directoryPath = values.directory[0];
    const rawFileName = values.fileName.trim();

    if (!directoryPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing folder",
        message: "Select an output folder.",
      });
      return;
    }

    if (!rawFileName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing filename",
        message: "Enter a filename.",
      });
      return;
    }

    const finalFileName = rawFileName.toLowerCase().endsWith(".json") ? rawFileName : `${rawFileName}.json`;
    const filePath = path.join(directoryPath, finalFileName);

    try {
      await exportFilterToPath(filePath, filter);
      await showToast({
        style: Toast.Style.Success,
        title: "Skill exported",
      });
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message,
      });
    }
  }

  const suggestedFileName = `skill-${filter.domain.replace(/[^a-z0-9.-]+/gi, "-")}.json`;

  return (
    <Form
      navigationTitle="Export Skill JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Skill" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Output folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField id="fileName" title="Filename" defaultValue={suggestedFileName} />
    </Form>
  );
}

export function ExportAllSkillsForm({ filters }: ExportAllSkillsFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: ExportAllSkillsFormValues) {
    const directoryPath = values.directory[0];
    const rawFileName = values.fileName.trim();

    if (!directoryPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing folder",
        message: "Select an output folder.",
      });
      return;
    }

    if (!rawFileName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing filename",
        message: "Enter a filename.",
      });
      return;
    }

    const finalFileName = rawFileName.toLowerCase().endsWith(".json") ? rawFileName : `${rawFileName}.json`;
    const filePath = path.join(directoryPath, finalFileName);

    try {
      const exportedCount = await exportFiltersToPath(filePath, filters);
      await showToast({
        style: Toast.Style.Success,
        title: "Skills exported",
        message: `${exportedCount} skill${exportedCount === 1 ? "" : "s"} exported.`,
      });
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message,
      });
    }
  }

  return (
    <Form
      navigationTitle="Export All Skills JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export All Skills" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Output folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField id="fileName" title="Filename" defaultValue="send-to-kindle-skills.json" />
    </Form>
  );
}
