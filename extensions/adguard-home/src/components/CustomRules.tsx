import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Form, confirmAlert, Color } from "@raycast/api";
import { useState } from "react";
import { CustomRule, addCustomRule, removeCustomRule } from "../api";

interface CustomRulesProps {
  rules: CustomRule[];
  isLoading: boolean;
  onRuleChange: () => void;
}

export function CustomRules({ rules, isLoading, onRuleChange }: CustomRulesProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  function getRuleTypeInfo(rule: string): { icon: Icon; color: Color; type: string } {
    if (rule.startsWith("||") && rule.endsWith("^")) {
      return { icon: Icon.Globe, color: Color.Blue, type: "Domain" };
    } else if (rule.startsWith("@@")) {
      return { icon: Icon.CheckCircle, color: Color.Green, type: "Allowlist" };
    } else if (rule.startsWith("127.0.0.1") || rule.startsWith("0.0.0.0")) {
      return { icon: Icon.XMarkCircle, color: Color.Red, type: "Hosts Block" };
    } else if (rule.includes("$")) {
      return { icon: Icon.Filter, color: Color.Orange, type: "Advanced Filter" };
    } else {
      return { icon: Icon.ExclamationMark, color: Color.Purple, type: "Basic Rule" };
    }
  }

  async function handleAddRule(rule: string) {
    try {
      await addCustomRule(rule);
      onRuleChange();
      showToast({ style: Toast.Style.Success, title: "Rule added successfully" });
      setShowAddForm(false);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to add rule",
        message: String(error),
      });
    }
  }

  async function handleFormSubmit(values: { rule: string }) {
    await handleAddRule(values.rule);
  }

  async function handleRemoveRule(rule: string) {
    const options = {
      title: "Remove Rule",
      message: "Are you sure you want to remove this rule?",
      primaryAction: {
        title: "Remove",
      },
    };

    if (await confirmAlert(options)) {
      try {
        await removeCustomRule(rule);
        onRuleChange();
        showToast({ style: Toast.Style.Success, title: "Rule removed successfully" });
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to remove rule",
          message: String(error),
        });
      }
    }
  }

  return (
    <>
      <List isLoading={isLoading}>
        {rules.map((rule, index) => {
          const { icon, color, type } = getRuleTypeInfo(rule.text);
          return (
            <List.Item
              key={index}
              title={rule.text}
              subtitle={type}
              icon={{ source: icon, tintColor: color }}
              accessories={[
                {
                  icon: {
                    source: rule.enabled ? Icon.CheckCircle : Icon.XMarkCircle,
                    tintColor: rule.enabled ? Color.Green : Color.Red,
                  },
                  tooltip: rule.enabled ? "Enabled" : "Disabled",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove Rule"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleRemoveRule(rule.text)}
                  />
                  <Action title="Add Rule" icon={Icon.Plus} onAction={() => setShowAddForm(true)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List>
      {showAddForm && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Add Rule" onSubmit={handleFormSubmit} />
              <Action title="Cancel" onAction={() => setShowAddForm(false)} />
            </ActionPanel>
          }
        >
          <Form.TextField id="rule" title="Rule" placeholder="Enter filtering rule (e.g., ||example.com^)" />
        </Form>
      )}
    </>
  );
}
