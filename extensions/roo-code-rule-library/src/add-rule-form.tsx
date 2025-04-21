import { useCustomModes } from "./hooks";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import EditTagsForm from "./tag-library";
import { Rule, Tag } from "./types";
import { fetchTagsFromStorage } from "./tag-storage";
import { addRuleToStorage, updateRuleInStorage } from "./rule-storage";

interface AddRuleFormValues {
  title: string;
  ruleIdentifier: string;
  modeSlug?: string;
  content: string;
  comment: string;
  tags: string[];
}

interface AddRuleFormProps {
  onRuleAdded: (rule: Rule | undefined) => void;
  initialRule?: Rule;
}

export default function AddRuleForm({ onRuleAdded, initialRule }: AddRuleFormProps) {
  const { pop } = useNavigation();
  const customModes = useCustomModes();
  const [availableTags, setAvailableTags] = useState<Tag[]>(initialRule?.tags?.map((name) => ({ name })) || []);

  useEffect(() => {
    const loadAvailableTags = async () => {
      try {
        const fetchedTags = await fetchTagsFromStorage();

        setAvailableTags((currentTags) => {
          const allTags = [...currentTags];
          fetchedTags.forEach((tag) => {
            if (!allTags.some((t) => t.name === tag.name)) {
              allTags.push(tag);
            }
          });
          return allTags;
        });
      } catch (error) {
        console.error(error);
      }
    };

    loadAvailableTags();
  }, []);
  const { handleSubmit, itemProps, values, setValue } = useForm<AddRuleFormValues>({
    initialValues: {
      modeSlug: initialRule?.modeSlug,
      title: initialRule?.title || "",
      ruleIdentifier: initialRule?.ruleIdentifier || "",
      content: initialRule?.content || "",
      comment: initialRule?.comment || "",
      tags: initialRule?.tags || [],
    },
    onSubmit: async (values) => {
      const selectedModeSlug = values.modeSlug;
      const ruleData = { ...values, modeSlug: selectedModeSlug, tags: values.tags ?? [] };

      try {
        let rule: Rule | undefined;
        if (initialRule) {
          rule = await updateRuleInStorage(initialRule, ruleData);
        } else {
          rule = await addRuleToStorage(ruleData);
        }

        onRuleAdded(rule);
        pop();
      } catch (error) {
        console.error(error);
      }
    },
    validation: {
      title: FormValidation.Required,
      ruleIdentifier: FormValidation.Required,
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialRule ? "Update Rule" : "Save Rule"} onSubmit={handleSubmit} />
          <Action.Push title="Edit Tags" target={<EditTagsForm />} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title"
        placeholder="Enter rule title"
        {...itemProps.title}
        onBlur={() => {
          if (!values.ruleIdentifier && values.title) {
            const slug = values.title
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
            setValue("ruleIdentifier", slug);
          } else if (!values.title) {
            setValue("ruleIdentifier", "");
          }
        }}
      />
      <Form.TextField
        title="Rule Identifier"
        placeholder="Enter unique rule identifier (e.g., my-rule)"
        {...itemProps.ruleIdentifier}
      />
      <Form.Dropdown
        title="Mode Slug"
        info="Mode-Specific Instructions: Apply only to a specific mode (e.g., code)."
        placeholder="Select a mode slug (optional)"
        {...itemProps.modeSlug}
      >
        <Form.Dropdown.Item value="" title="None" />
        <Form.Dropdown.Item value="code" title="Code" />
        <Form.Dropdown.Item value="architect" title="Architect" />
        <Form.Dropdown.Item value="ask" title="Ask" />
        <Form.Dropdown.Item value="debug" title="Debug" />
        {customModes.map((mode) => (
          <Form.Dropdown.Item key={mode.slug} value={mode.slug} title={mode.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Rule Content" placeholder="Enter rule content (markdown)" {...itemProps.content} />
      <Form.TextArea title="Comment" placeholder="Enter a short comment for use cases" {...itemProps.comment} />
      <Form.TagPicker title="Tags" placeholder="Select tags" {...itemProps.tags}>
        {availableTags.map((tag) => (
          <Form.TagPicker.Item key={tag.name} value={tag.name} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
