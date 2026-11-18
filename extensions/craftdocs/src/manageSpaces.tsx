import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { CraftConfig } from "./Config";
import { CraftEnvironmentList } from "./components/CraftCommandState";
import SpaceIdTutorial from "./components/SpaceIdTutorial";
import useCraftCommandContext from "./hooks/useCraftCommandContext";
import { canToggleSpaceEnabled, shouldShowSpaceIdTutorial } from "./lib/manageSpaces";

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
  const command = useCraftCommandContext();
  const { push } = useNavigation();
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean | null>(null);
  const config = command.config.config;

  useEffect(() => {
    const loadTutorialState = async () => {
      const tutorialSeen = await LocalStorage.getItem("hasSeenSpaceIdTutorial");
      setHasSeenTutorial(Boolean(tutorialSeen));
    };

    void loadTutorialState();
  }, []);

  const showSpaceIdTutorial = () => {
    push(
      <SpaceIdTutorial
        craftApplicationPath={
          command.environment.environment?.status === "ready"
            ? command.environment.environment.application.path
            : undefined
        }
      />,
    );
  };

  useEffect(() => {
    if (
      hasSeenTutorial !== false ||
      !config ||
      !shouldShowSpaceIdTutorial({ hasSeenTutorial, spacesCount: config.spaces.length })
    ) {
      return;
    }

    void LocalStorage.setItem("hasSeenSpaceIdTutorial", "true").then(() => {
      showSpaceIdTutorial();
      setHasSeenTutorial(true);
    });
  }, [config, hasSeenTutorial]);

  const handleRename = (spaceID: string, newName: string | null) => {
    command.config.setSpaceCustomName(spaceID, newName);
  };

  const handleToggleEnabled = async (config: CraftConfig, spaceID: string, currentlyEnabled: boolean) => {
    const space = config.spaces.find((entry) => entry.spaceID === spaceID);
    if (!space) {
      return;
    }

    if (!canToggleSpaceEnabled({ space, currentlyEnabled })) {
      await showToast({
        title: "Cannot disable primary Space",
        message: "The primary Space cannot be disabled",
        style: Toast.Style.Failure,
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: currentlyEnabled ? "Disable Space" : "Enable Space",
      message: currentlyEnabled
        ? "This Space will be hidden from search results and other commands."
        : "This Space will be shown in search results and other commands.",
      primaryAction: { title: currentlyEnabled ? "Disable" : "Enable", style: Alert.ActionStyle.Default },
    });

    if (!confirmed) {
      return;
    }

    command.config.toggleSpaceEnabled(spaceID);
    showToast({
      title: currentlyEnabled ? "Space disabled" : "Space enabled",
      style: Toast.Style.Success,
    });
  };

  if (command.loading) {
    return <List isLoading={true} />;
  }

  if (!command.environment.environment || command.environment.environment.status !== "ready") {
    return <CraftEnvironmentList environment={command.environment.environment} />;
  }

  if (!config) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
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
          title="No Spaces found"
          description="Try using Craft app first to initialize your Spaces"
          icon="command-icon-small.png"
        />
      </List>
    );
  }

  return (
    <List>
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
                    onAction={() => handleToggleEnabled(config, space.spaceID, space.isEnabled)}
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
