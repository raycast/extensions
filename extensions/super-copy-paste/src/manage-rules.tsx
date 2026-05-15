import { useState } from "react";
import { List, ActionPanel, Action, Icon, Form, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import crypto from "crypto";

import { RegexRule } from "./engine";

const COMMANDS = [
  { id: "super-copy-1", title: "Super Copy 1" },
  { id: "super-copy-2", title: "Super Copy 2" },
  { id: "super-copy-3", title: "Super Copy 3" },
  { id: "super-paste-1", title: "Super Paste 1" },
  { id: "super-paste-2", title: "Super Paste 2" },
  { id: "super-paste-3", title: "Super Paste 3" },
];

function generateId() {
  return crypto.randomUUID();
}

export default function Command() {
  const [selectedCommand, setSelectedCommand] = useState<string>(COMMANDS[0].id);
  const { value: rules, setValue: setRules, isLoading } = useLocalStorage<RegexRule[]>(`rules_${selectedCommand}`, []);

  const handleCreate = (rule: RegexRule) => {
    setRules([...(rules || []), rule]);
  };

  const handleEdit = (updatedRule: RegexRule) => {
    setRules((rules || []).map((r) => (r.id === updatedRule.id ? updatedRule : r)));
  };

  const handleDelete = (id: string) => {
    setRules((rules || []).filter((r) => r.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setRules((rules || []).map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newRules = [...(rules || [])];
    const temp = newRules[index];
    newRules[index] = newRules[index - 1];
    newRules[index - 1] = temp;
    setRules(newRules);
  };

  const handleMoveDown = (index: number) => {
    if (!rules || index === rules.length - 1) return;
    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[index + 1];
    newRules[index + 1] = temp;
    setRules(newRules);
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Manage Rules"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Command Profile" value={selectedCommand} onChange={setSelectedCommand}>
          {COMMANDS.map((cmd) => (
            <List.Dropdown.Item key={cmd.id} title={cmd.title} value={cmd.id} />
          ))}
        </List.Dropdown>
      }
    >
      {(rules || []).map((rule, index) => (
        <List.Item
          key={rule.id}
          icon={rule.isActive ? Icon.CheckCircle : Icon.Circle}
          title={rule.name}
          subtitle={`Find: ${rule.findPattern} -> Replace: ${rule.replaceWith}`}
          accessories={[{ tooltip: `Execution Order: ${index + 1}`, text: `#${index + 1}` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Rule"
                icon={Icon.Pencil}
                target={<RuleForm initialRule={rule} onSave={handleEdit} />}
              />
              <Action.Push
                title="Create New Rule"
                icon={Icon.Plus}
                target={<RuleForm onSave={handleCreate} />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action
                title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                icon={rule.isActive ? Icon.XMarkCircle : Icon.CheckCircle}
                onAction={() => handleToggleActive(rule.id)}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              {index > 0 && (
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  onAction={() => handleMoveUp(index)}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                />
              )}
              {index < (rules?.length || 0) - 1 && (
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  onAction={() => handleMoveDown(index)}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                />
              )}
              <Action
                title="Delete Rule"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(rule.id)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {(!rules || rules.length === 0) && !isLoading && (
        <List.EmptyView
          title="No rules yet"
          description="Create your first regex cleanup rule for this command."
          actions={
            <ActionPanel>
              <Action.Push title="Create New Rule" target={<RuleForm onSave={handleCreate} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function RuleForm({ initialRule, onSave }: { initialRule?: RegexRule; onSave: (rule: RegexRule) => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState<string>(initialRule?.name || "");
  const [findPattern, setFindPattern] = useState<string>(initialRule?.findPattern || "");
  const [replaceWith, setReplaceWith] = useState<string>(initialRule?.replaceWith || "");

  const [nameError, setNameError] = useState<string | undefined>();
  const [findPatternError, setFindPatternError] = useState<string | undefined>();

  const appendToFindPattern = (snippet: string) => {
    setFindPattern((prev) => prev + snippet);
  };

  return (
    <Form
      navigationTitle={initialRule ? "Edit Rule" : "Create Rule"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Rule"
            icon={Icon.Check}
            onSubmit={() => {
              if (!name) {
                setNameError("Name is required");
                return;
              }
              if (!findPattern) {
                setFindPatternError("Find pattern is required");
                return;
              }

              try {
                new RegExp(findPattern);
              } catch {
                setFindPatternError("Invalid regex pattern");
                return;
              }

              onSave({
                id: initialRule?.id || generateId(),
                name: name,
                findPattern: findPattern,
                replaceWith: replaceWith,
                isActive: initialRule ? initialRule.isActive : true,
              });
              pop();
            }}
          />
          <ActionPanel.Submenu
            title="Insert Regex Snippet…"
            icon={Icon.CodeBlock}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          >
            <ActionPanel.Section title="Types of Characters">
              <Action title="Any Character (.)" onAction={() => appendToFindPattern(".")} />
              <Action title="Digit (\d)" onAction={() => appendToFindPattern("\\d")} />
              <Action title="Word Character (\w)" onAction={() => appendToFindPattern("\\w")} />
              <Action title="Whitespace (\s)" onAction={() => appendToFindPattern("\\s")} />
              <Action title="Lowercase Letter ([a-z])" onAction={() => appendToFindPattern("[a-z]")} />
              <Action title="Uppercase Letter ([A-Z])" onAction={() => appendToFindPattern("[A-Z]")} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Locations">
              <Action title="Start of Line (^)" onAction={() => appendToFindPattern("^")} />
              <Action title="End of Line ($)" onAction={() => appendToFindPattern("$")} />
              <Action title="Word Boundary (\b)" onAction={() => appendToFindPattern("\\b")} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Quantities">
              <Action title="Zero or More (*)" onAction={() => appendToFindPattern("*")} />
              <Action title="One or More (+)" onAction={() => appendToFindPattern("+")} />
              <Action title="Optional (?)" onAction={() => appendToFindPattern("?")} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Groups">
              <Action title="Capture Group ( ( … ) )" onAction={() => appendToFindPattern("()")} />
              <Action title="Non-Capturing Group ( (?: … ) )" onAction={() => appendToFindPattern("(?:)")} />
              <Action title="Or ( | )" onAction={() => appendToFindPattern("|")} />
            </ActionPanel.Section>
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Rule Name"
        value={name}
        error={nameError}
        onChange={(val) => {
          setName(val);
          setNameError(undefined);
        }}
      />
      <Form.TextField
        id="findPattern"
        title="Find Regex Pattern"
        value={findPattern}
        error={findPatternError}
        onChange={(val) => {
          setFindPattern(val);
          setFindPatternError(undefined);
        }}
      />
      <Form.TextArea
        id="replaceWith"
        title="Replace With"
        value={replaceWith}
        onChange={setReplaceWith}
        info="Use $1, $2 for capture groups. Escaped characters like \n will be evaluated properly."
      />
      <Form.Separator />
      <Form.Description
        title="Quick Tip"
        text="Press ⌘+I or use the Action Menu to insert common regex symbols directly into your pattern."
      />
    </Form>
  );
}
