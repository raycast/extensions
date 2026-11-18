import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import path from "path";
import { useEffect, useMemo, useState } from "react";
import { getSkillMarkdownFromZip, importSkillFromZip } from "@/lib/skills";
import { pathExists } from "@/lib/paths";
import { validateSkillName } from "@/lib/validate";

type SkillImportFormProps = {
  skillsDir: string;
  onImported?: () => void | Promise<void>;
};

type FormValues = {
  zipFile: string[];
  skillName: string;
};

function getSkillNameFromZip(zipPath: string): string {
  return path.basename(zipPath, path.extname(zipPath));
}

export default function SkillImportForm({ skillsDir, onImported }: SkillImportFormProps) {
  const { pop } = useNavigation();
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [skillName, setSkillName] = useState("");
  const [zipError, setZipError] = useState<string | undefined>(undefined);
  const [preview, setPreview] = useState("");
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);

  const defaultName = useMemo(() => (zipPath ? getSkillNameFromZip(zipPath) : ""), [zipPath]);

  const displayName = skillName || defaultName;
  const previewText = previewLoading ? "Loading preview..." : preview || "Select a ZIP file";

  useEffect(() => {
    let isActive = true;

    const loadPreview = async () => {
      if (!zipPath) {
        if (isActive) {
          setPreview("");
          setPreviewError(undefined);
        }
        return;
      }
      setPreviewLoading(true);
      try {
        const content = await getSkillMarkdownFromZip(zipPath);
        if (!isActive) {
          return;
        }
        const trimmed = content.trim();
        const truncated = trimmed.length > 5000 ? `${trimmed.slice(0, 5000)}\n\n...` : trimmed;
        setPreview(truncated);
        setPreviewError(undefined);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setPreview("");
        setPreviewError(error instanceof Error ? error.message : "Failed to read SKILL.md.");
      } finally {
        if (isActive) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();
    return () => {
      isActive = false;
    };
  }, [zipPath]);

  async function handleSubmit(values: FormValues) {
    const selectedZip = values.zipFile?.[0];
    if (!selectedZip) {
      setZipError("ZIP file is required");
      await showToast({
        style: Toast.Style.Failure,
        title: "ZIP file is required",
      });
      return;
    }

    if (path.extname(selectedZip).toLowerCase() !== ".zip") {
      setZipError("Only .zip files are supported");
      await showToast({
        style: Toast.Style.Failure,
        title: "Only .zip files are supported",
      });
      return;
    }
    setZipError(undefined);

    const name = values.skillName.trim() || getSkillNameFromZip(selectedZip);
    if (!name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Skill name is required",
      });
      return;
    }
    const nameError = validateSkillName(name);
    if (nameError) {
      await showToast({ style: Toast.Style.Failure, title: nameError });
      return;
    }

    const targetDir = path.join(skillsDir, name);
    const exists = await pathExists(targetDir);
    if (exists) {
      const confirmed = await confirmAlert({
        title: `Overwrite ${name}?`,
        message: "This will replace the existing skill folder.",
        primaryAction: {
          title: "Overwrite",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) {
        return;
      }
    }

    try {
      await importSkillFromZip(skillsDir, selectedZip, {
        overwrite: exists,
        skillName: name,
      });
      await showToast({
        style: Toast.Style.Success,
        title: `Imported ${name}`,
      });
      if (onImported) {
        await onImported();
      }
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to import",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Import Skill from ZIP"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="zipFile"
        title="ZIP File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={zipError}
        onChange={(files) => {
          const selected = files?.[0] ?? null;
          if (selected && path.extname(selected).toLowerCase() !== ".zip") {
            setZipError("Only .zip files are supported");
            void showToast({
              style: Toast.Style.Failure,
              title: "Only .zip files are supported",
            });
            setZipPath(null);
            setSkillName("");
            return;
          }
          setZipError(undefined);
          setZipPath(selected);
          if (selected) {
            setSkillName(getSkillNameFromZip(selected));
          } else {
            setSkillName("");
          }
        }}
      />
      <Form.TextField id="skillName" title="Skill Name" value={displayName} onChange={setSkillName} />
      <Form.TextArea
        id="preview"
        title="SKILL.md Preview"
        value={previewText}
        error={previewError}
        enableMarkdown
        onChange={() => {}}
      />
    </Form>
  );
}
