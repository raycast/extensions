import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { loginOrg, saveOrgMetadata } from "./lib/sfdx";
import { ORG_COLOR_PRESETS } from "./lib/utils";

export default function AddOrgForm({ onOrgAdded }: { onOrgAdded: () => void }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [orgType, setOrgType] = useState("sandbox");
  const [customUrl, setCustomUrl] = useState("");
  const [alias, setAlias] = useState("");

  // Metadata State
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#0000FF");
  const [openTo, setOpenTo] = useState("home");
  const [section, setSection] = useState("Miscellaneous Orgs");

  const handleSubmit = async () => {
    if (!alias) {
      await showToast({ style: Toast.Style.Failure, title: "Alias is required" });
      return;
    }

    setIsLoading(true);

    // Determine the instance URL
    let instanceUrl = "https://login.salesforce.com"; // Default for Production/Dev Hub

    if (orgType === "sandbox") {
      instanceUrl = "https://test.salesforce.com";
    } else if (orgType === "custom") {
      if (!customUrl) {
        await showToast({ style: Toast.Style.Failure, title: "Custom URL is required" });
        setIsLoading(false);
        return;
      }
      instanceUrl = customUrl;
    }
    // Note: "production" and "devhub" both use login.salesforce.com

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Check your browser",
        message: "Log in to Salesforce to complete setup.",
      });

      // 1. Perform Login
      const username = await loginOrg(alias, instanceUrl);

      // 2. Save Metadata immediately
      // If user selected Developer Hub, let's default the section to "Production" or "Developer Orgs" if they haven't chosen one
      let finalSection = section;
      if (orgType === "devhub" && section === "Miscellaneous Orgs") {
        finalSection = "Production";
      }

      await saveOrgMetadata(username, {
        label: label || alias,
        color,
        section: finalSection,
        openTo: openTo as "home" | "setup" | "developer-console" | "custom",
      });

      await showToast({ style: Toast.Style.Success, title: "Org Added", message: `${alias} is ready!` });

      onOrgAdded();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Login Failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log In" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the information below. Clicking 'Log In' will open your browser to authenticate." />

      <Form.Dropdown id="orgType" title="Type" value={orgType} onChange={setOrgType}>
        <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="production" title="Production" icon="💼" />
        <Form.Dropdown.Item value="devhub" title="Developer Org" icon="💻" />
      </Form.Dropdown>

      {orgType === "custom" && (
        <Form.TextField
          id="customUrl"
          title="Custom Domain URL"
          placeholder="https://my-domain.my.salesforce.com"
          value={customUrl}
          onChange={setCustomUrl}
        />
      )}

      <Form.TextField
        id="alias"
        title="Alias"
        placeholder="my-org-alias"
        value={alias}
        onChange={setAlias}
        info="Required: Internal name for CLI"
      />

      <Form.Separator />

      <Form.TextField
        id="label"
        title="Label"
        placeholder="My Org"
        value={label}
        onChange={setLabel}
        info="Friendly name for display"
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
      </Form.Dropdown>

      <Form.Dropdown id="openTo" title="Open To" value={openTo} onChange={setOpenTo}>
        <Form.Dropdown.Item value="home" title="Lightning Home" />
        <Form.Dropdown.Item value="setup" title="Setup Home" />
        <Form.Dropdown.Item value="developer-console" title="Developer Console" />
      </Form.Dropdown>

      <Form.Dropdown id="section" title="Section" value={section} onChange={setSection}>
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
