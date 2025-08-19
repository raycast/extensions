import { List, ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useSettings } from "../hooks/useSettings";

interface SettingsFormData {
  showWelcomeMessage: boolean;
  defaultSearchType: "name" | "number" | "both";
  maxSearchResults: number;
  showMoveIndicators: boolean;
  enablePerformanceMonitoring: boolean;
}

export default function SettingsView() {
  const { settings, updateSetting, resetToDefaults } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const { pop } = useNavigation();

  const handleSave = (values: SettingsFormData) => {
    Object.entries(values).forEach(([key, value]) => {
      updateSetting(key as keyof SettingsFormData, value);
    });
    setIsEditing(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Save Settings" onSubmit={handleSave} />
            <Action title="Cancel" onAction={() => setIsEditing(false)} />
            <Action title="Reset to Defaults" onAction={handleReset} style={Action.Style.Destructive} />
          </ActionPanel>
        }
      >
        <Form.Checkbox
          id="showWelcomeMessage"
          title="Show Welcome Message"
          label="Display welcome message when no favorites exist"
          defaultValue={settings.showWelcomeMessage}
        />
        <Form.Dropdown id="defaultSearchType" title="Default Search Type" defaultValue={settings.defaultSearchType}>
          <Form.Dropdown.Item value="both" title="Both Name and Number" />
          <Form.Dropdown.Item value="name" title="Company Name Only" />
          <Form.Dropdown.Item value="number" title="Organization Number Only" />
        </Form.Dropdown>
        <Form.TextField
          id="maxSearchResults"
          title="Maximum Search Results"
          placeholder="50"
          defaultValue={settings.maxSearchResults.toString()}
        />
        <Form.Checkbox
          id="showMoveIndicators"
          title="Show Move Indicators"
          label="Always show move indicators for favorites"
          defaultValue={settings.showMoveIndicators}
        />
        <Form.Checkbox
          id="enablePerformanceMonitoring"
          title="Performance Monitoring"
          label="Enable performance monitoring (development only)"
          defaultValue={settings.enablePerformanceMonitoring}
        />
      </Form>
    );
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Edit Settings" onAction={() => setIsEditing(true)} />
          <Action title="Reset to Defaults" onAction={handleReset} style={Action.Style.Destructive} />
          <Action title="Back" onAction={pop} />
        </ActionPanel>
      }
    >
      <List.Section title="User Settings">
        <List.Item
          title="Welcome Message"
          subtitle={settings.showWelcomeMessage ? "Enabled" : "Disabled"}
          icon={settings.showWelcomeMessage ? "✅" : "❌"}
        />
        <List.Item title="Default Search Type" subtitle={settings.defaultSearchType} icon="🔍" />
        <List.Item title="Max Search Results" subtitle={settings.maxSearchResults.toString()} icon="📊" />
        <List.Item
          title="Move Indicators"
          subtitle={settings.showMoveIndicators ? "Always Visible" : "On ⌘⇧ Press"}
          icon={settings.showMoveIndicators ? "👁️" : "👁️‍🗨️"}
        />
        <List.Item
          title="Performance Monitoring"
          subtitle={settings.enablePerformanceMonitoring ? "Enabled" : "Disabled"}
          icon={settings.enablePerformanceMonitoring ? "📈" : "📉"}
        />
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Edit Settings"
          subtitle="Modify your preferences"
          icon="⚙️"
          actions={
            <ActionPanel>
              <Action title="Edit Settings" onAction={() => setIsEditing(true)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Reset to Defaults"
          subtitle="Restore default settings"
          icon="🔄"
          actions={
            <ActionPanel>
              <Action title="Reset to Defaults" onAction={handleReset} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
