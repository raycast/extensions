import { Action, ActionPanel, Form, LaunchProps, open, Icon, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { languages } from "./languages";

type FormValues = {
  /** the query to search for */
  query: string;
  /** whether the query is a symbol */
  isSymbol: boolean;
  /** the programing language to search for */
  language: string;
  /** the file extensions to search for */
  extensions?: string;
  /** the organization to search within */
  org?: string;
};

export default function Command(
  props: LaunchProps<{ draftValues: FormValues; arguments: Arguments.GithubCodeSearch }>,
) {
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      await open(`https://github.com/search?${buildQueryParams(values)}`);
      popToRoot();
    },
    initialValues: {
      query: props.draftValues?.query ?? props.fallbackText ?? "",
      isSymbol: props.draftValues?.isSymbol ?? false,
      language: props.draftValues?.language ?? "",
      extensions: props.draftValues?.extensions ?? "",
      org: props.draftValues?.org ?? "",
    },
    validation: {
      query: (value) => (value && value.length > 0 ? null : "Query cannot be empty"),
    },
  });

  if (props.arguments.query) {
    handleSubmit({
      query: props.arguments.query,
      language: props.arguments.language,
      isSymbol: false,
    });
    return null;
  }

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory target="https://github.com/search/advanced" text="Open Advanced Search" />
      }
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Search" icon={Icon.MagnifyingGlass} />
          <Action.CopyToClipboard
            title="Copy Search URL"
            content={`https://github.com/search?${buildQueryParams(values)}`}
          />
          <Action.OpenInBrowser title="Open Advanced Search" url="https://github.com/search/advanced" />
        </ActionPanel>
      }
    >
      <Form.TextField title="Query" placeholder="Search..." {...itemProps.query} />
      <Form.Separator />
      <Form.Description text="Search Options" />
      <Form.Checkbox
        label="Symbol"
        title="Search for symbols"
        storeValue
        {...itemProps.isSymbol}
        // force this to be an uncontrolled input
        // so the stored value is respected
        // https://github.com/raycast/utils/issues/19
        value={undefined}
      />
      <Form.Dropdown title="Written in this language" {...itemProps.language}>
        {languages.map(({ name, value }, index) => (
          <Form.Dropdown.Item value={value} title={name} key={index} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="With this extension" placeholder="rb, py, jpg" {...itemProps.extensions} />
      <Form.TextField title="Organization" placeholder="github" {...itemProps.org} />
    </Form>
  );
}

const buildQueryParams = ({ query, isSymbol, language, extensions, org }: FormValues) => {
  const queries = [isSymbol ? `symbol:${query}` : query];

  if (language) {
    // if the language has a space, we need to wrap it in quotes
    queries.push(language.includes(" ") ? `language:"${language}"` : `language:${language}`);
  }

  if (extensions) {
    // if the user has entered a comma separated list of extensions,
    // we need to wrap each one in a path:*.ext, and then join them with an OR.
    // e.g. (path:*.rb OR path:*.py)
    queries.push(
      `(${extensions
        .split(",")
        .map((ext) => `path:*.${ext.trim()}`)
        .join(" OR ")})`,
    );
  }

  if (org) {
    queries.push(`org:${org}`);
  }

  return new URLSearchParams({
    type: "code",
    q: queries.join(" "),
  });
};
