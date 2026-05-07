import {
  Action,
  ActionPanel,
  Application,
  Detail,
  Form,
  Icon,
  Toast,
  getApplications,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { getActionIcon, getActionTypeLabel } from "./actions";
import { getCaptureCandidate, CaptureCandidate } from "./capture";
import {
  buildCapturedAction,
  flattenGroupDestinations,
  getSuggestedKey,
  GroupDestination,
} from "./capture-utils";
import {
  addItemToGroup,
  checkKeyConflict,
  findGroupByPath,
  generateId,
  getConfig,
  saveConfig,
} from "./storage";
import { ActionType, RootConfig } from "./types";
import { filterWebUrlApplications } from "./browser-utils";

type CapturableActionType = Exclude<ActionType, "command">;

const ROOT_DESTINATION = JSON.stringify([]);

export default function QuickCapture() {
  const [config, setConfig] = useState<RootConfig | null>(null);
  const [candidate, setCandidate] = useState<CaptureCandidate | null>(null);
  const [webApplications, setWebApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destinationValue, setDestinationValue] = useState(ROOT_DESTINATION);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [actionType, setActionType] =
    useState<CapturableActionType>("application");
  const [value, setValue] = useState("");
  const [browser, setBrowser] = useState("");

  useEffect(() => {
    async function load() {
      const [loadedConfig, detectedCandidate, installedApplications] =
        await Promise.all([
          getConfig(),
          getCaptureCandidate(),
          getSortedApplications(),
        ]);

      setConfig(loadedConfig);
      setCandidate(detectedCandidate);
      setWebApplications(await filterWebUrlApplications(installedApplications));

      if (detectedCandidate) {
        setLabel(detectedCandidate.label);
        setActionType(detectedCandidate.type);
        setValue(detectedCandidate.value);
        setBrowser(detectedCandidate.browser || "");
        setKey(getSuggestedKey(detectedCandidate.label, loadedConfig));
      }

      setIsLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    if (actionType !== "url" && browser) {
      setBrowser("");
    }
  }, [actionType, browser]);

  const destinations = useMemo(
    () => (config ? flattenGroupDestinations(config) : []),
    [config],
  );

  function handleDestinationChange(nextValue: string) {
    setDestinationValue(nextValue);

    if (!config || !candidate) {
      return;
    }

    const group = getDestinationGroup(config, parseDestinationValue(nextValue));
    if (group) {
      setKey(getSuggestedKey(label || candidate.label, group));
    }
  }

  async function handleSubmit() {
    if (!config) {
      return;
    }

    const destinationPath = parseDestinationValue(destinationValue);
    const destinationGroup = getDestinationGroup(config, destinationPath);

    if (!destinationGroup) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Destination not found",
      });
      return;
    }

    const normalizedKey = key.trim().slice(0, 1).toLowerCase();
    if (!normalizedKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Key required",
        message: "Please enter a single character key",
      });
      return;
    }

    const conflict = checkKeyConflict(destinationGroup, normalizedKey);
    if (conflict.hasConflict) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Key conflict",
        message: `Key "${normalizedKey}" is already used by "${conflict.conflictLabel}"`,
      });
      return;
    }

    if (!value.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Value required",
      });
      return;
    }

    setIsSubmitting(true);

    const item = buildCapturedAction({
      id: generateId(),
      key: normalizedKey,
      type: actionType,
      label: label.trim(),
      value: value.trim(),
      browser,
    });

    const nextConfig = await addItemToGroup(config, destinationPath, item);
    await saveConfig(nextConfig);
    await showToast({
      style: Toast.Style.Success,
      title: "Shortcut captured",
      message: label || value,
    });
    await popToRoot();
  }

  if (isLoading) {
    return <Detail isLoading markdown="Detecting current context..." />;
  }

  if (!config || !candidate) {
    return (
      <Detail
        markdown="No capturable app, URL, folder, or path was found."
        actions={
          <ActionPanel>
            <Action
              title="Close"
              icon={Icon.XMarkCircle}
              onAction={popToRoot}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Shortcut"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Detected from ${candidate.source}. Confirm the details before saving.`}
      />
      <Form.Dropdown
        id="destination"
        title="Destination"
        value={destinationValue}
        onChange={handleDestinationChange}
      >
        {destinations.map((destination: GroupDestination) => (
          <Form.Dropdown.Item
            key={JSON.stringify(destination.path)}
            value={JSON.stringify(destination.path)}
            title={destination.label}
            icon={Icon.Folder}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="key"
        title="Key"
        value={key}
        onChange={(nextKey) => setKey(nextKey.slice(0, 1).toLowerCase())}
        placeholder="Single character"
      />
      <Form.TextField
        id="label"
        title="Label"
        value={label}
        onChange={setLabel}
        placeholder="Display name"
      />
      <Form.Dropdown
        id="actionType"
        title="Action Type"
        value={actionType}
        onChange={(nextType) => setActionType(nextType as CapturableActionType)}
      >
        <Form.Dropdown.Item
          value="application"
          title={getActionTypeLabel("application")}
          icon={getActionIcon("application")}
        />
        <Form.Dropdown.Item
          value="url"
          title={getActionTypeLabel("url")}
          icon={getActionIcon("url")}
        />
        <Form.Dropdown.Item
          value="folder"
          title={getActionTypeLabel("folder")}
          icon={getActionIcon("folder")}
        />
      </Form.Dropdown>
      <Form.TextField
        id="value"
        title={getValueTitle(actionType)}
        value={value}
        onChange={setValue}
        placeholder={getValuePlaceholder(actionType)}
      />
      {actionType === "url" && (
        <Form.Dropdown
          id="browser"
          title="Open With"
          value={browser}
          onChange={setBrowser}
          info="Choose which browser to open this URL with. System Default inherits from the parent group or OS default."
        >
          <BrowserDropdownItems applications={webApplications} />
        </Form.Dropdown>
      )}
    </Form>
  );
}

async function getSortedApplications(): Promise<Application[]> {
  const applications = await getApplications();
  return applications.sort((a, b) => a.name.localeCompare(b.name));
}

function BrowserDropdownItems({
  applications,
}: {
  applications: Application[];
}) {
  return (
    <>
      <Form.Dropdown.Item value="" title="System Default" icon={Icon.Globe} />
      {applications.map((app) => (
        <Form.Dropdown.Item
          key={app.bundleId || app.path}
          value={app.path}
          title={app.name}
          icon={{ fileIcon: app.path }}
        />
      ))}
    </>
  );
}

function parseDestinationValue(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getDestinationGroup(config: RootConfig, path: string[]) {
  return path.length === 0 ? config : findGroupByPath(config, path);
}

function getValueTitle(actionType: CapturableActionType): string {
  switch (actionType) {
    case "application":
      return "Application";
    case "url":
      return "URL";
    case "folder":
      return "Path";
  }
}

function getValuePlaceholder(actionType: CapturableActionType): string {
  switch (actionType) {
    case "application":
      return "/Applications/App.app";
    case "url":
      return "https://example.com";
    case "folder":
      return "/path/to/folder";
  }
}
