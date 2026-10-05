import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Skill, SkillMetadata } from "@/types";
import { buildSkillTemplate, createSkill, updateSkillContent } from "@/lib/skills";
import {
  type SkillFormErrors,
  validateSkillContent,
  validateSkillNameWithDuplicates,
  validateSkillForm,
} from "@/lib/validate";
import SkillImportForm from "@/commands/skills/import-form";

type SkillFormProps =
  | {
      mode: "create";
      skillsDir: string;
      existingNames: string[];
      onSaved?: () => void | Promise<void>;
    }
  | {
      mode: "edit";
      skillsDir: string;
      skill: Skill;
      existingNames: string[];
      onSaved?: () => void | Promise<void>;
    };

type SkillFormValues = {
  name: string;
  content?: string;
};

const SKILL_FILE = "SKILL.md";

export default function SkillForm(props: SkillFormProps) {
  const { pop } = useNavigation();
  const skillPath = props.mode === "edit" ? props.skill.path : null;

  const initialValues: SkillFormValues = useMemo(() => {
    if (props.mode === "edit") {
      return {
        name: props.skill.name,
        content: "",
      };
    }

    return {
      name: "",
      content: "",
    };
  }, [props]);

  const [nameValue, setNameValue] = useState(initialValues.name);
  const [contentValue, setContentValue] = useState(initialValues.content ?? "");
  const [contentTouched, setContentTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(props.mode === "edit");
  const [errors, setErrors] = useState<SkillFormErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const lastAutoTemplate = useRef("");

  useEffect(() => {
    if (props.mode !== "create") {
      return;
    }
    if (contentTouched) {
      return;
    }
    if (!nameValue.trim()) {
      setContentValue("");
      return;
    }
    const nextTemplate = buildSkillTemplate(nameValue.trim());
    lastAutoTemplate.current = nextTemplate;
    setContentValue(nextTemplate);
  }, [nameValue, contentTouched, props.mode]);

  useEffect(() => {
    if (props.mode !== "create") {
      return;
    }
    if (contentTouched && contentValue.trim().length === 0) {
      setContentTouched(false);
      lastAutoTemplate.current = "";
    }
  }, [contentTouched, contentValue, props.mode]);

  useEffect(() => {
    if (!skillPath) {
      return;
    }

    const loadContent = async () => {
      try {
        const content = await fs.readFile(path.join(skillPath, SKILL_FILE), "utf8");
        setContentValue(content);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load SKILL.md",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadContent();
  }, [skillPath]);

  async function handleSubmit(values: typeof initialValues) {
    const trimmedName = values.name.trim();

    const nextErrors = validateSkillForm(values, {
      checkDuplicates: true,
      existingNames: props.existingNames,
    });
    setErrors(nextErrors);
    setShowErrors(true);
    if (hasErrors(nextErrors)) {
      return;
    }

    const metadata: SkillMetadata = { name: trimmedName || undefined };

    try {
      if (props.mode === "create") {
        await createSkill(props.skillsDir, trimmedName, metadata, values.content);
        await showToast({ style: Toast.Style.Success, title: "Skill created" });
      } else {
        let targetSkillPath = props.skill.path;
        if (trimmedName !== props.skill.name) {
          const nextPath = path.join(props.skillsDir, trimmedName);
          await fs.rename(targetSkillPath, nextPath);
          targetSkillPath = nextPath;
        }
        await updateSkillContent(targetSkillPath, values.content ?? "");
        await showToast({ style: Toast.Style.Success, title: "Skill updated" });
      }

      if (props.onSaved) {
        await props.onSaved();
      }
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={props.mode === "edit" ? "Edit Skill" : "Create Skill"}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
          {props.mode === "create" ? (
            <Action.Push
              title="Import Skill from Zip"
              icon={Icon.ArrowDownCircle}
              target={<SkillImportForm skillsDir={props.skillsDir} onImported={props.onSaved} />}
            />
          ) : null}
          <Action.SubmitForm
            title="Copy to Clipboard"
            onSubmit={async (values: SkillFormValues) => {
              if (!values.content?.trim()) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "SKILL.md content is empty",
                });
                return;
              }
              await Clipboard.copy(values.content);
              await showToast({
                style: Toast.Style.Success,
                title: "SKILL.md copied",
              });
            }}
          />
        </ActionPanel>
      }
    >
      {props.mode === "create" ? (
        <Form.TextField
          id="name"
          title="Name"
          value={nameValue}
          error={showErrors ? errors.name : undefined}
          onChange={(value) => {
            setNameValue(value);
            if (showErrors) {
              setErrors((current) => ({
                ...current,
                name: validateSkillNameWithDuplicates(value.trim(), props.existingNames),
                content: validateSkillContent(contentValue, value),
              }));
            }
          }}
        />
      ) : (
        <Form.TextField
          id="name"
          title="Name"
          value={nameValue}
          error={showErrors ? errors.name : undefined}
          onChange={(value) => {
            setNameValue(value);
            if (showErrors) {
              setErrors((current) => ({
                ...current,
                name: validateSkillNameWithDuplicates(value.trim(), props.existingNames),
                content: validateSkillContent(contentValue),
              }));
            }
          }}
        />
      )}
      {props.mode === "create" ? (
        <Form.TextArea
          id="content"
          title="SKILL.md Content"
          placeholder="Paste full SKILL.md content here"
          value={contentValue}
          error={showErrors ? errors.content : undefined}
          onChange={(value) => {
            if (value === lastAutoTemplate.current || value.trim().length === 0) {
              setContentTouched(false);
            } else {
              setContentTouched(true);
            }
            setContentValue(value);
            if (showErrors) {
              setErrors((current) => ({
                ...current,
                content: validateSkillContent(value, nameValue),
              }));
            }
          }}
        />
      ) : (
        !isLoading && (
          <Form.TextArea
            id="content"
            title="SKILL.md Content"
            placeholder="Paste full SKILL.md content here"
            value={contentValue}
            error={showErrors ? errors.content : undefined}
            onChange={(value) => {
              setContentValue(value);
              if (showErrors) {
                setErrors((current) => ({
                  ...current,
                  content: validateSkillContent(value, nameValue),
                }));
              }
            }}
          />
        )
      )}
    </Form>
  );
}

function hasErrors(errors: SkillFormErrors): boolean {
  return Object.values(errors).some((error) => Boolean(error));
}
