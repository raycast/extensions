import { Form, List, Action, ActionPanel, Icon, useNavigation, confirmAlert, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { help_action } from "./helpers/helpPage.jsx";
import { AIPreset, getAIPresets, getSubtitle, setAIPresets } from "./helpers/presets.jsx";

import * as providers from "./api/providers.js";
import { ChatProvidersReact } from "./api/providers_react.jsx";
import { Preferences } from "./api/preferences.js";

export default function ManageAIPresets() {
  let [presets, setPresets] = useState(null);
  useEffect(() => {
    (async () => {
      const retrieved = await getAIPresets();
      setPresets(retrieved);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await setAIPresets(presets);
    })();
  }, [presets]);

  const EditPresetForm = (props) => {
    const { pop } = useNavigation();

    if (props.props) props = props.props; // wow

    const idx = props.idx ?? 0;
    const newPreset = props.newPreset || false;
    let preset = newPreset
      ? new AIPreset({
          name: "New Preset",
          provider: providers.default_provider_string(),
          webSearch: Preferences["webSearch"],
          creativity: "0.7",
          isDefault: false,
        })
      : presets[idx];

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Save"
              onSubmit={async (values) => {
                // Ensure no empty/duplicate names
                if (preset.name === "") {
                  await showToast(Toast.Style.Failure, "Preset name cannot be empty");
                  return;
                }
                if ((newPreset || preset.name !== values.name) && presets.map((x) => x.name).includes(values.name)) {
                  await showToast(Toast.Style.Failure, "Preset name already exists");
                  return;
                }

                preset.name = values.name;
                preset.provider = values.provider;
                preset.webSearch = values.webSearch;
                preset.creativity = values.creativity;
                preset.systemPrompt = values.systemPrompt;
                preset.isDefault = values.isDefault;

                if (newPreset) {
                  setPresets([...presets, preset]);
                } else {
                  const newPresets = presets.map((x, i) => (i === idx ? preset : x));
                  setPresets(newPresets);
                }
                pop();
              }}
            />
            {help_action("aiPresets")}
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="Name" defaultValue={preset.name} />
        <Form.Description title="Provider" text="The provider and model used for this chat." />
        <Form.Dropdown id="provider" defaultValue={preset.provider}>
          {ChatProvidersReact}
        </Form.Dropdown>

        <Form.Description title="Web Search" text="Allow GPT to search the web for information." />
        <Form.Dropdown id="webSearch" defaultValue={preset.webSearch}>
          <Form.Dropdown.Item title="Disabled" value="off" />
          <Form.Dropdown.Item title="Automatic" value="auto" />
          <Form.Dropdown.Item title="Always" value="always" />
        </Form.Dropdown>

        <Form.Description
          title="Creativity"
          text="Technical tasks like coding require less creativity, while open-ended ones require more."
        />
        <Form.Dropdown id="creativity" defaultValue={preset.creativity}>
          <Form.Dropdown.Item title="None" value="0.0" />
          <Form.Dropdown.Item title="Low" value="0.3" />
          <Form.Dropdown.Item title="Medium" value="0.5" />
          <Form.Dropdown.Item title="High" value="0.7" />
          <Form.Dropdown.Item title="Very High" value="1.0" />
        </Form.Dropdown>

        <Form.Description title="System Prompt" text="This prompt will be sent to GPT to start the conversation." />
        <Form.TextArea id="systemPrompt" defaultValue={preset.systemPrompt} />

        <Form.Checkbox id="isDefault" label="Set as Default" defaultValue={preset.isDefault} />
      </Form>
    );
  };

  const PresetActionPanel = (props) => {
    return (
      <ActionPanel>
        <Action.Push title="Edit Preset" icon={Icon.TextCursor} target={<EditPresetForm props={props} />} />
        <Action.Push
          title="Create Preset"
          icon={Icon.PlusCircle}
          target={<EditPresetForm newPreset={true} />}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <Action
          title="Delete Preset"
          icon={Icon.Trash}
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure?",
              message: "You cannot recover this preset.",
              icon: Icon.Trash,
              primaryAction: {
                title: "Delete Preset Forever",
                style: Action.Style.Destructive,
                onAction: () => {
                  const newPresets = presets.filter((x, idx) => idx !== props.idx);
                  setPresets(newPresets);
                },
              },
            });
          }}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          style={Action.Style.Destructive}
        />
        {help_action("aiPresets")}
      </ActionPanel>
    );
  };

  const presetsToListItems = (presets) => {
    return presets.map((x, idx) => {
      return (
        <List.Item title={x.name} subtitle={getSubtitle(x)} key={x.name} actions={<PresetActionPanel idx={idx} />} />
      );
    });
  };

  if (!presets || presets.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Bookmark}
          title="Start by creating an AI Preset..."
          actions={
            <ActionPanel>
              <Action.Push title="Create Preset" icon={Icon.PlusCircle} target={<EditPresetForm newPreset={true} />} />
              {help_action("aiPresets")}
            </ActionPanel>
          }
        />
      </List>
    );
  } else return <List searchBarPlaceholder="Search AI Presets">{presetsToListItems(presets)}</List>;
}
