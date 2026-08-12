import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { SalesforceOrg } from "./lib/sfdx";
import { ORG_COLOR_PRESETS } from "./lib/utils";

const ORG_METADATA_KEY = "org-metadata";

export function EditOrgForm({ org, onSave }: { org: SalesforceOrg; onSave: () => void }) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#0000FF");
  const [openTo, setOpenTo] = useState<string>("home");
  const [customPath, setCustomPath] = useState("");
  const [section, setSection] = useState("Miscellaneous Orgs");

  // Load existing metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const stored = await LocalStorage.getItem<string>(ORG_METADATA_KEY);
        if (stored) {
          const allMetadata = JSON.parse(stored);
          const metadata = allMetadata[org.username];
          if (metadata) {
            setLabel(metadata.label || org.alias || "");
            setColor(metadata.color || "#0000FF");
            setOpenTo(metadata.openTo || "home");
            setCustomPath(metadata.customPath || "");
            setSection(metadata.section || "Miscellaneous Orgs");
            return;
          }
        }
        // Default to alias if no metadata
        setLabel(org.alias || org.username);
      } catch (error) {
        console.error("Failed to load metadata:", error);
      }
    }
    loadMetadata();
  }, [org]);

  const handleSubmit = async (values: {
    label: string;
    color: string;
    openTo: string;
    customPath: string;
    section: string;
  }) => {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving..." });

      // Load existing metadata
      const stored = await LocalStorage.getItem<string>(ORG_METADATA_KEY);
      const allMetadata = stored ? JSON.parse(stored) : {};

      // Update metadata for this org
      allMetadata[org.username] = {
        label: values.label,
        color: values.color,
        openTo: values.openTo,
        customPath: values.openTo === "custom" ? values.customPath : undefined,
        section: values.section,
      };

      await LocalStorage.setItem(ORG_METADATA_KEY, JSON.stringify(allMetadata));

      await showToast({ style: Toast.Style.Success, title: "Org updated!" });
      onSave();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Org URL: ${org.instanceUrl}`} />
      <Form.Description text={`Username: ${org.username}`} />
      <Form.Description text={`Org ID: ${org.orgId}`} />
      <Form.Separator />

      <Form.TextField
        id="label"
        title="Label"
        placeholder="My Org"
        value={label}
        onChange={setLabel}
        info="Custom display name for this org"
      />

      <Form.Dropdown id="color" title="Color" value={color} onChange={setColor} info="Icon color">
        {ORG_COLOR_PRESETS.map((preset) => (
          <Form.Dropdown.Item
            key={preset.hex}
            value={preset.hex}
            title={preset.name}
            icon={{ source: Icon.CircleFilled, tintColor: preset.hex }}
          />
        ))}
        {!ORG_COLOR_PRESETS.some((preset) => preset.hex.toLowerCase() === color.toLowerCase()) && (
          <Form.Dropdown.Item
            key={color}
            value={color}
            title={`Custom (${color})`}
            icon={{ source: Icon.CircleFilled, tintColor: color }}
          />
        )}
      </Form.Dropdown>

      <Form.Dropdown
        id="openTo"
        title="Open To"
        value={openTo}
        onChange={setOpenTo}
        info="Where to navigate when opening this org"
      >
        <Form.Dropdown.Item value="home" title="Lightning Home" />
        <Form.Dropdown.Item value="setup" title="Setup Home" />
        <Form.Dropdown.Item value="developer-console" title="Developer Console" />
        <Form.Dropdown.Item value="custom" title="Custom" />
      </Form.Dropdown>

      {openTo === "custom" && (
        <Form.TextField
          id="customPath"
          title="Custom Path"
          placeholder="/lightning/o/Account/list?filterName=__Recent"
          value={customPath}
          onChange={setCustomPath}
          info="Custom Salesforce path (e.g., /lightning/o/Account/list)"
        />
      )}

      <Form.Dropdown
        id="section"
        title="Section"
        value={section}
        onChange={setSection}
        info="Group this org into a section"
      >
        <Form.Dropdown.Item value="Miscellaneous Orgs" title="Miscellaneous Orgs" />
        <Form.Dropdown.Item value="Production" title="Production" />
        <Form.Dropdown.Item value="Sandboxes" title="Sandboxes" />
        <Form.Dropdown.Item value="Scratch Orgs" title="Scratch Orgs" />
        <Form.Dropdown.Item value="Developer Orgs" title="Developer Orgs" />
        <Form.Dropdown.Item value="Testing" title="Testing" />
      </Form.Dropdown>
    </Form>
  );
}
