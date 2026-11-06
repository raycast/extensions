import { Action, ActionPanel, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useMemo, useState } from "react";
import { analyzeDocument, formatDocument, hasComments, operationLabel } from "../lib/document";
import {
  colorSwatch,
  DEFAULT_ICON,
  faIcon,
  getIconEntry,
  ICON_COLORS,
  IconEntry,
  IconStyle,
  prettyIconName,
  searchIcons,
} from "../lib/icons";
import { Shortcuts } from "../lib/shortcuts";
import { saveQuery, useStore } from "../lib/store";
import { SavedQuery } from "../lib/types";
import { EnvironmentForm } from "./EnvironmentForm";
import { QueryPreview } from "./QueryPreview";

interface Values {
  name: string;
  environmentId: string;
  icon: string;
  iconColor: string;
  query: string;
}

interface Props {
  query?: SavedQuery;
  /** Pre-filled values for a new query */
  draft?: Partial<SavedQuery>;
}

const QUERY_PLACEHOLDER = `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
  }
}`;

const STYLE_ORDER: IconStyle[] = ["Solid", "Regular", "Brands"];

export function QueryForm({ query, draft }: Props) {
  const { pop } = useNavigation();
  const { environments } = useStore();
  const [iconSearch, setIconSearch] = useState("");
  const source = query ?? draft;

  const { handleSubmit, itemProps, values, setValue } = useForm<Values>({
    initialValues: {
      name: source?.name ?? "",
      environmentId: source?.environmentId ?? environments[0]?.id ?? "",
      icon: source?.icon ?? DEFAULT_ICON,
      iconColor: source?.iconColor ?? "default",
      query: source?.query ?? "",
    },
    validation: {
      name: FormValidation.Required,
      environmentId: FormValidation.Required,
      query: (value) => {
        if (!value?.trim()) return "Required";
        return analyzeDocument(value).error;
      },
    },
    async onSubmit(values) {
      await saveQuery(
        {
          name: values.name.trim(),
          query: values.query,
          environmentId: values.environmentId || undefined,
          icon: values.icon,
          iconColor: values.iconColor,
        },
        query?.id,
      );
      await showToast({ style: Toast.Style.Success, title: query ? "Query updated" : "Query created" });
      pop();
    },
  });

  const analysis = useMemo(() => analyzeDocument(values.query), [values.query]);

  const iconSections = useMemo(() => {
    const results = searchIcons(iconSearch);
    const selected = getIconEntry(values.icon);
    const sections: { title: string; entries: IconEntry[] }[] = [];
    // The selected icon must always be among the items, otherwise the dropdown would reset its value.
    if (selected && !results.some((entry) => entry.id === selected.id)) {
      sections.push({ title: "Selected", entries: [selected] });
    }
    for (const style of STYLE_ORDER) {
      const entries = results.filter((entry) => entry.style === style);
      if (entries.length) sections.push({ title: iconSearch ? style : `Popular ${style}`, entries });
    }
    return sections;
  }, [iconSearch, values.icon]);

  async function handleFormat() {
    if (!values.query.trim()) return;
    if (hasComments(values.query)) {
      const confirmed = await confirmAlert({
        title: "Remove comments?",
        message: "Formatting rewrites the query and drops # comments.",
        primaryAction: { title: "Format" },
      });
      if (!confirmed) return;
    }
    try {
      setValue("query", formatDocument(values.query));
    } catch (error) {
      await showFailureToast(error, { title: "Cannot format query" });
    }
  }

  return (
    <Form
      navigationTitle={query ? `Edit ${query.name}` : "New Query"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Query" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.Push
            title="Preview Query"
            icon={Icon.Eye}
            shortcut={Shortcuts.Preview}
            target={<QueryPreview name={values.name || "Untitled"} query={values.query} />}
          />
          <Action title="Format Query" icon={Icon.Wand} shortcut={Shortcuts.Format} onAction={handleFormat} />
          <Action.Push
            title="Create Environment"
            icon={Icon.Globe}
            shortcut={Shortcuts.Environments}
            target={<EnvironmentForm onSaved={(env) => setValue("environmentId", env.id)} />}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Get user by id" autoFocus={!query} {...itemProps.name} />

      {environments.length > 0 ? (
        <Form.Dropdown title="Environment" {...itemProps.environmentId}>
          {environments.map((env) => (
            <Form.Dropdown.Item key={env.id} value={env.id} title={env.name} icon={Icon.Globe} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Environment"
          text="No environments yet. Press ⌘⇧E (Ctrl+Shift+E on Windows) to create one."
        />
      )}

      <Form.Dropdown
        title="Icon"
        info="Any Font Awesome Free icon. Type to search all ~2,000 icons by name or alias."
        filtering={false}
        throttle
        onSearchTextChange={setIconSearch}
        {...itemProps.icon}
      >
        {iconSections.map((section) => (
          <Form.Dropdown.Section key={section.title} title={section.title}>
            {section.entries.map((entry) => (
              <Form.Dropdown.Item
                key={entry.id}
                value={entry.id}
                title={prettyIconName(entry)}
                icon={faIcon(entry.id, values.iconColor)}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Icon Color" {...itemProps.iconColor}>
        {ICON_COLORS.map((color) => (
          <Form.Dropdown.Item key={color.id} value={color.id} title={color.title} icon={colorSwatch(color)} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextArea
        title="Query"
        placeholder={QUERY_PLACEHOLDER}
        info="Queries, mutations and fragments are supported. Press ⌘⇧P to preview with syntax highlighting, ⌘⇧F to format."
        {...itemProps.query}
      />
      <Form.Description title="Detected" text={describeAnalysis(values.query, analysis)} />
    </Form>
  );
}

function describeAnalysis(source: string, analysis: ReturnType<typeof analyzeDocument>): string {
  if (!source.trim()) return "Type or paste a query, mutation or a document with several operations.";
  if (analysis.error) return `⚠️ ${analysis.error}`;
  return analysis.operations
    .map((operation) => {
      const variables = operation.variables.map(
        (variable) => `$${variable.name}: ${variable.type}${variable.kind === "json" ? " (JSON)" : ""}`,
      );
      const suffix = operation.type === "subscription" ? " — subscriptions can't be run over HTTP" : "";
      return `${operationLabel(operation)}${suffix}\n${variables.length ? variables.join("\n") : "no variables"}`;
    })
    .join("\n\n");
}
