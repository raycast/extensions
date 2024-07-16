import { Form, ActionPanel, Action, Clipboard, showHUD, PopToRootType, LocalStorage } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

type Values = {
  branchType: string;
  prefix: string;
  description: string;
  snakeCase: boolean;
  prefixDate: boolean;
  includeGitCommand: boolean;
  hideDefaultBranchTypes: boolean;
};

function slugify(content: string, snakeCase: boolean) {
  const separator = snakeCase ? "_" : "-";
  return (
    content
      .toLowerCase()
      // replace all but 0-9, a-z, and / with the separator
      .replace(new RegExp(`[^0-9a-z/]`, "g"), separator)
      // replace multiple separators with a single separator
      .replace(new RegExp(`[${separator}]+`, "g"), separator)
      // trim separators from the beginning
      .replace(new RegExp(`^${separator}+`), "")
      // trim separators from the end
      .replace(new RegExp(`${separator}+$`), "")
      // only take the first 100 characters
      .substring(0, 100)
  );
}

export default function Command() {
  const [customDropdownValue, setCustomDropdownValue] = useState("/");
  const [viewDefaultBranchTypes, setViewDefaultBranchTypes] = useState(true);
  const [customBranchTypes, setCustomBranchTypes] = useState<string[]>([]);

  useEffect(() => {
    (async function () {
      const itemsFromLocalStorage = await LocalStorage.allItems();
      setCustomBranchTypes(Object.values(itemsFromLocalStorage));
    })();
  }, []);

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ branchType, prefix, description, snakeCase, prefixDate, includeGitCommand }) {
      // save custom branch type to local storage
      await LocalStorage.setItem(branchType, branchType);

      // leave trailing space for slugify to add separator
      const date = prefixDate ? `${new Date().toISOString().split("T")[0]}-` : "";
      const content = `${date}${prefix}${branchType}${description}`;
      const gitCommand = includeGitCommand ? "git checkout -b " : "";
      const branchName = `${gitCommand}${slugify(content, snakeCase)}`;

      Clipboard.copy(branchName);
      await showHUD(`Copied to your clipboard: ${branchName}`, {
        popToRootType: PopToRootType.Immediate,
        clearRootSearch: true,
      });
    },
    validation: {
      description: (value) => (value ? null : "Please enter a description for the branch name."),
    },
  });

  function handleSearchText(searchText: string) {
    setCustomDropdownValue(searchText);
  }

  function handleHideDefaultBranchTypes(isHidden: boolean) {
    setViewDefaultBranchTypes(!isHidden);
  }

  async function clearCustomBranchTypes() {
    await LocalStorage.clear();
    setCustomBranchTypes([]);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Branch Name to Clipboard" onSubmit={handleSubmit} />
          <Action.SubmitForm title="Clear Custom Branch Types" onSubmit={clearCustomBranchTypes} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="branchType"
        title="Branch Type"
        placeholder="Custom... (Enter existing branch type to delete)"
        onSearchTextChange={handleSearchText}
        storeValue
      >
        <Form.Dropdown.Section title="Custom Branch Types">
          <Form.Dropdown.Item value={customDropdownValue} title={customDropdownValue} />
          {customBranchTypes.map((branchType, index) => (
            <Form.Dropdown.Item key={index} value={branchType} title={branchType} />
          ))}
        </Form.Dropdown.Section>
        {viewDefaultBranchTypes ? (
          <Form.Dropdown.Section title="Default Branch Types">
            <Form.Dropdown.Item value="fix/" title="fix/ (bugs or issues)" />
            <Form.Dropdown.Item value="feat/" title="feat/ (add new features)" />
            <Form.Dropdown.Item value="refactor/" title="refactor/ (improve efficiency)" />
            <Form.Dropdown.Item value="chore/" title="chore/ (non-production changes)" />
            <Form.Dropdown.Item value="docs/" title="docs/ (add or modify documentation)" />
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
      <Form.Checkbox
        id="hideDefaultBranchTypes"
        label="Hide Default Branch Types"
        onChange={handleHideDefaultBranchTypes}
        storeValue
      />
      <Form.TextField
        {...itemProps.description}
        title="Description"
        placeholder="Description of this branch"
        storeValue
      />
      <Form.TextField
        id="prefix"
        title="Prefix"
        placeholder="Add a custom prefix for the branch: (e.g. prefix/)"
        storeValue
      />
      <Form.Checkbox
        id="snakeCase"
        title="Use `snake_case`"
        label="Use `snake_case` instead of `kebab-case`"
        storeValue
      />
      <Form.Checkbox
        id="prefixDate"
        title="Prefix Date"
        label="Add today's date as a prefix (e.g. 2024-06-05-)"
        storeValue
      />
      <Form.Checkbox
        id="includeGitCommand"
        title="Copy Git Command"
        label="Include `git checkout -b` when copying to clipboard"
        storeValue
      />
    </Form>
  );
}
