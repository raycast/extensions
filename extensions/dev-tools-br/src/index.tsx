import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  categories,
  type FieldDefinition,
  type ToolDefinition,
  type ToolResult,
  type ToolValues,
} from "./types";
import { tools } from "./tools";

export default function Command() {
  const [category, setCategory] = useState("all");
  const visibleTools = useMemo(
    () => (category === "all" ? tools : tools.filter((tool) => tool.category === category)),
    [category],
  );

  return (
    <List
      navigationTitle="Dev Tools BR"
      searchBarPlaceholder={`Pesquise entre ${tools.length} ferramentas…`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filtrar categoria" value={category} onChange={setCategory}>
          <List.Dropdown.Item title="Todas as categorias" value="all" />
          {categories.map((item) => (
            <List.Dropdown.Item key={item} title={item} value={item} />
          ))}
        </List.Dropdown>
      }
    >
      {categories.map((section) => {
        const sectionTools = visibleTools.filter((tool) => tool.category === section);
        if (sectionTools.length === 0) return null;
        return (
          <List.Section key={section} title={section} subtitle={`${sectionTools.length}`}>
            {sectionTools.map((tool) => (
              <List.Item
                key={tool.id}
                title={tool.title}
                subtitle={tool.description}
                icon={{ source: tool.icon ?? Icon.Hammer, tintColor: categoryColor(tool.category) }}
                keywords={[tool.category, ...(tool.keywords ?? [])]}
                accessories={[{ text: tool.fields?.length ? `${tool.fields.length} opções` : "1 clique" }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Abrir Ferramenta"
                      icon={Icon.ArrowRight}
                      target={<ToolRunner tool={tool} />}
                    />
                    <Action.CopyToClipboard title="Copiar Nome" content={tool.title} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function ToolRunner({ tool }: { tool: ToolDefinition }) {
  const { push } = useNavigation();

  async function run(values: ToolValues) {
    try {
      const result = await tool.run(values);
      push(<ResultView tool={tool} result={result} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Não foi possível executar",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!tool.fields?.length) {
    return <AutoRunner tool={tool} />;
  }

  return (
    <Form
      navigationTitle={tool.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Executar" icon={Icon.Play} onSubmit={run} />
        </ActionPanel>
      }
    >
      <Form.Description title={tool.title} text={tool.description} />
      {tool.fields.map((field) => (
        <Field key={field.name} field={field} />
      ))}
    </Form>
  );
}

function AutoRunner({ tool }: { tool: ToolDefinition }) {
  const [result, setResult] = useState<ToolResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.resolve(tool.run({}))
      .then(setResult)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [tool]);

  if (error) return <Detail markdown={`# Erro\n\n${escapeMarkdown(error)}`} />;
  if (!result) return <Detail isLoading navigationTitle={tool.title} markdown="" />;
  return <ResultView tool={tool} result={result} />;
}

function Field({ field }: { field: FieldDefinition }) {
  switch (field.type) {
    case "text":
      return (
        <Form.TextField
          id={field.name}
          title={field.title}
          placeholder={field.placeholder}
          defaultValue={field.defaultValue}
        />
      );
    case "password":
      return (
        <Form.PasswordField
          id={field.name}
          title={field.title}
          placeholder={field.placeholder}
          defaultValue={field.defaultValue}
        />
      );
    case "textarea":
      return (
        <Form.TextArea
          id={field.name}
          title={field.title}
          placeholder={field.placeholder}
          defaultValue={field.defaultValue}
        />
      );
    case "checkbox":
      return (
        <Form.Checkbox
          id={field.name}
          title={field.title}
          label={field.label}
          defaultValue={field.defaultValue}
        />
      );
    case "date":
      return (
        <Form.DatePicker
          id={field.name}
          title={field.title}
          defaultValue={field.defaultValue ?? new Date()}
        />
      );
    case "dropdown":
      return (
        <Form.Dropdown
          id={field.name}
          title={field.title}
          defaultValue={field.defaultValue ?? field.options[0]?.value}
        >
          {field.options.map((option) => (
            <Form.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </Form.Dropdown>
      );
  }
}

function ResultView({ tool, result }: { tool: ToolDefinition; result: ToolResult }) {
  const isUrl = /^https?:\/\/\S+$/.test(result.value);
  const markdown = `# ${escapeMarkdown(result.title)}\n\n${result.subtitle ? `${escapeMarkdown(result.subtitle)}\n\n` : ""}\`\`\`text\n${result.value.replace(/```/g, "` ` `")}\n\`\`\``;

  return (
    <Detail
      navigationTitle={tool.title}
      markdown={markdown}
      metadata={
        result.metadata?.length ? (
          <Detail.Metadata>
            {result.metadata.map((item) => (
              <Detail.Metadata.Label
                key={`${item.label}-${item.value}`}
                title={item.label}
                text={item.value}
              />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copiar Resultado" content={result.value} />
          <Action.Paste title="Colar No Aplicativo Ativo" content={result.value} />
          {isUrl ? <Action.OpenInBrowser title="Abrir URL" url={result.value} /> : null}
          <Action.Push title="Executar Novamente" icon={Icon.Repeat} target={<ToolRunner tool={tool} />} />
        </ActionPanel>
      }
    />
  );
}

function categoryColor(category: ToolDefinition["category"]): Color {
  const colors: Record<ToolDefinition["category"], Color> = {
    Geradores: Color.Blue,
    Validadores: Color.Green,
    Texto: Color.Purple,
    Computação: Color.Orange,
    Matemática: Color.Yellow,
    Áreas: Color.Magenta,
    "Datas e Horas": Color.Red,
  };
  return colors[category];
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}
