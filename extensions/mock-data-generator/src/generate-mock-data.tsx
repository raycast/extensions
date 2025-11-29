import { Form, ActionPanel, Action, Clipboard, showToast, Toast, Detail } from "@raycast/api";
import { useState, Fragment } from "react";
import { LANGUAGES, OUTPUT_FORMATS, COMMON_FIELD_SETS } from "../constants/typeMapping";
import { generateMockData } from "../generators";
import type { LanguageId, FieldType, OutputFormat } from "../types";

interface FieldWithId {
  id: string;
  name: string;
  type: FieldType;
}

const FIELD_TYPES: { id: FieldType; name: string }[] = [
  { id: "string", name: "String" },
  { id: "integer", name: "Integer" },
  { id: "boolean", name: "Boolean" },
  { id: "date", name: "Date" },
  { id: "array", name: "Array" },
];

const MAX_RECORD_COUNT = 10000;

export default function Command() {
  const [language, setLanguage] = useState<LanguageId>("java");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("class");
  const [className, setClassName] = useState<string>("MyClass");
  const [recordCount, setRecordCount] = useState<number>(1);
  const [fields, setFields] = useState<FieldWithId[]>([
    { id: "1", name: "id", type: "integer" },
    { id: "2", name: "name", type: "string" },
  ]);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const handleGenerate = async () => {
    try {
      // Show progress toast for large datasets
      if (recordCount > 100) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Generating...",
          message: `Creating ${recordCount} records with random data`,
        });
      }

      const fieldsWithoutId = fields.map(({ name, type }) => ({ name, type }));
      const code = generateMockData(language, outputFormat, className, fieldsWithoutId, recordCount);
      setGeneratedCode(code);
      setShowPreview(true);

      if (recordCount > 100) {
        await showToast({
          style: Toast.Style.Success,
          title: "Generated!",
          message: `${recordCount} records created successfully`,
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleCopyToClipboard = async () => {
    await Clipboard.copy(generatedCode);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
    });
  };

  const addField = () => {
    const newField: FieldWithId = {
      id: Date.now().toString(),
      name: "",
      type: "string",
    };
    setFields([...fields, newField]);
  };

  const removeLastField = () => {
    if (fields.length > 1) {
      setFields(fields.slice(0, -1));
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot remove",
        message: "At least one field is required",
      });
    }
  };

  const loadTemplate = (templateName: keyof typeof COMMON_FIELD_SETS) => {
    const template = COMMON_FIELD_SETS[templateName];
    const templateFields = template.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      ...f,
    }));
    setFields(templateFields);
    showToast({
      style: Toast.Style.Success,
      title: "Template loaded",
      message: `Loaded ${templateName} template`,
    });
  };

  const updateFieldName = (index: number, value: string) => {
    const updated = [...fields];
    updated[index].name = value;
    setFields(updated);
  };

  const updateFieldType = (index: number, value: FieldType) => {
    const updated = [...fields];
    updated[index].type = value;
    setFields(updated);
  };

  if (showPreview) {
    return (
      <Detail
        markdown={`\`\`\`${language}\n${generatedCode}\n\`\`\``}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Actions">
              <Action
                title="Copy to Clipboard"
                onAction={handleCopyToClipboard}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "c" },
                  Windows: { modifiers: ["ctrl"], key: "c" },
                }}
              />
              <Action.Paste
                content={generatedCode}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "v" },
                  Windows: { modifiers: ["ctrl"], key: "v" },
                }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Back to Form"
                onAction={() => setShowPreview(false)}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "b" },
                  Windows: { modifiers: ["ctrl"], key: "b" },
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Generate">
            <Action
              title="Generate & Preview"
              onAction={handleGenerate}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "g" },
                Windows: { modifiers: ["ctrl"], key: "g" },
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Fields">
            <Action
              title="Add Field"
              onAction={addField}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "n" },
                Windows: { modifiers: ["ctrl"], key: "n" },
              }}
            />
            <Action
              title="Remove Last Field"
              onAction={removeLastField}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "backspace" },
                Windows: { modifiers: ["ctrl"], key: "backspace" },
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Templates">
            <Action
              title="Load User Template"
              onAction={() => loadTemplate("user")}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "u" },
                Windows: { modifiers: ["ctrl", "shift"], key: "u" },
              }}
            />
            <Action
              title="Load Product Template"
              onAction={() => loadTemplate("product")}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "p" },
                Windows: { modifiers: ["ctrl", "shift"], key: "p" },
              }}
            />
            <Action
              title="Load Blog Template"
              onAction={() => loadTemplate("blog")}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "b" },
                Windows: { modifiers: ["ctrl", "shift"], key: "b" },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Generate mock data in multiple languages and testing frameworks. Customize fields and instantly copy the output." />

      <Form.Dropdown
        id="language"
        title="Language"
        value={language}
        onChange={(value) => {
          setLanguage(value as LanguageId);
          // Reset output format when language changes
          setOutputFormat(OUTPUT_FORMATS[value as LanguageId][0].id);
        }}
      >
        {LANGUAGES.map((lang) => (
          <Form.Dropdown.Item key={lang.id} value={lang.id} title={lang.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="outputFormat"
        title="Output Format"
        value={outputFormat}
        onChange={(value) => setOutputFormat(value as OutputFormat)}
      >
        {OUTPUT_FORMATS[language]?.map((format) => (
          <Form.Dropdown.Item key={format.id} value={format.id} title={format.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="className"
        title="Class/Object Name"
        placeholder="e.g., User, Product, BlogPost"
        value={className}
        onChange={setClassName}
      />

      <Form.TextField
        id="recordCount"
        title="Number of Records"
        placeholder="1"
        value={recordCount.toString()}
        onChange={(value) => {
          const num = Number.parseInt(value) || 1;
          const capped = Math.min(Math.max(num, 1), MAX_RECORD_COUNT);
          setRecordCount(capped);
        }}
        info="Generate 1-10,000 records with realistic random data"
      />

      <Form.Separator />

      <Form.Description text={`Fields (${fields.length})`} />

      {fields.map((field, index) => (
        <Fragment key={field.id}>
          <Form.TextField
            id={`field-name-${field.id}`}
            title={`Field ${index + 1} Name`}
            placeholder="e.g., username, email, age"
            value={field.name}
            onChange={(value) => updateFieldName(index, value)}
          />
          <Form.Dropdown
            id={`field-type-${field.id}`}
            title={`Field ${index + 1} Type`}
            value={field.type}
            onChange={(value) => updateFieldType(index, value as FieldType)}
          >
            {FIELD_TYPES.map((type) => (
              <Form.Dropdown.Item key={type.id} value={type.id} title={type.name} />
            ))}
          </Form.Dropdown>
        </Fragment>
      ))}
    </Form>
  );
}
