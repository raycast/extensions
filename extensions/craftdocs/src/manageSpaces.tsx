import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import useConfig from "./hooks/useConfig";
import useAppExists from "./hooks/useAppExists";
import SpaceIdTutorial from "./components/SpaceIdTutorial";

interface RenameSpaceFormProps {
  spaceID: string;
  currentName: string | null;
  onRename: (spaceID: string, newName: string | null) => void;
}

function RenameSpaceForm({ spaceID, currentName, onRename }: RenameSpaceFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(currentName || "");

  const handleSubmit = () => {
    const finalName = name.trim() || null;
    onRename(spaceID, finalName);
    showToast({
      title: finalName ? "Space renamed" : "Custom name removed",
      style: Toast.Style.Success,
    });
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" onSubmit={handleSubmit} />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Space Name"
        value={name}
        onChange={setName}
        placeholder="Enter custom name (leave empty to use Space ID)"
      />
      <Form.Description text={`Space ID: ${spaceID}`} />
    </Form>
  );
}

export default function ManageSpaces() {
  const appExists = useAppExists();
  const { config, configLoading, refreshConfig } = useConfig(appExists);
  const { push } = useNavigation();
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if this is the first time opening Manage Spaces
  useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenTutorial = await LocalStorage.getItem("hasSeenSpaceIdTutorial");
      if (!hasSeenTutorial) {
        setShowTutorial(true);
        await LocalStorage.setItem("hasSeenSpaceIdTutorial", "true");
      }
    };
    checkFirstTime();
  }, []);

  const showSpaceIdTutorial = () => {
    push(<SpaceIdTutorial />);
  };

  // Show tutorial on first visit
  useEffect(() => {
    if (showTutorial && config && config.spaces.length > 0) {
      showSpaceIdTutorial();
      setShowTutorial(false);
    }
  }, [showTutorial, config]);

  const handleRename = (spaceID: string, newName: string | null) => {
    if (config) {
      config.setSpaceCustomName(spaceID, newName);
      refreshConfig();
    }
  };

  const handleToggleEnabled = async (spaceID: string, currentlyEnabled: boolean) => {
    if (!config) return;

    const space = config.spaces.find((s) => s.spaceID === spaceID);
    if (!space) return;

    // Don't allow disabling the primary space
    if (space.primary && currentlyEnabled) {
      await showToast({
        title: "Cannot disable primary space",
        message: "The primary space cannot be disabled",
        style: Toast.Style.Failure,
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: currentlyEnabled ? "Disable Space" : "Enable Space",
      message: currentlyEnabled
        ? "This space will be hidden from search results and other commands."
        : "This space will be shown in search results and other commands.",
      primaryAction: { title: currentlyEnabled ? "Disable" : "Enable", style: Alert.ActionStyle.Default },
    });

    if (confirmed) {
      config.toggleSpaceEnabled(spaceID);
      refreshConfig();
      showToast({
        title: currentlyEnabled ? "Space disabled" : "Space enabled",
        style: Toast.Style.Success,
      });
    }
  };

  if (!appExists.appExists || !config) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Show Space ID Tutorial"
              icon={Icon.QuestionMark}
              onAction={showSpaceIdTutorial}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="Craft not found"
          description="Make sure Craft is installed and configured properly"
          icon="command-icon-small.png"
        />
      </List>
    );
  }

  if (config.spaces.length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Show Space ID Tutorial"
              icon={Icon.QuestionMark}
              onAction={showSpaceIdTutorial}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="No spaces found"
          description="Try using Craft app first to initialize your spaces"
          icon="command-icon-small.png"
        />
      </List>
    );
  }

  return (
    <List isLoading={configLoading}>
      <List.Section title={`${config.spaces.length} Space${config.spaces.length === 1 ? "" : "s"} Found`}>
        {config.spaces.map((space) => {
          const displayName = config.getSpaceDisplayName(space.spaceID);
          const isCustomNamed = space.customName !== null;

          return (
            <List.Item
              key={space.spaceID}
              title={displayName}
              subtitle={isCustomNamed ? `ID: ${space.spaceID}` : undefined}
              accessories={[
                ...(space.primary ? [{ tag: "Primary" }] : []),
                {
                  tag: {
                    value: space.isEnabled ? "Enabled" : "Disabled",
                    color: space.isEnabled ? "#00FF00" : "#FF0000",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Rename Space"
                    icon={Icon.Pencil}
                    target={
                      <RenameSpaceForm spaceID={space.spaceID} currentName={space.customName} onRename={handleRename} />
                    }
                  />
                  <Action
                    title={space.isEnabled ? "Disable Space" : "Enable Space"}
                    icon={space.isEnabled ? Icon.EyeDisabled : Icon.Eye}
                    onAction={() => handleToggleEnabled(space.spaceID, space.isEnabled)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Space ID"
                    content={space.spaceID}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action
                    title="Show Space ID Tutorial"
                    icon={Icon.QuestionMark}
                    onAction={showSpaceIdTutorial}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
