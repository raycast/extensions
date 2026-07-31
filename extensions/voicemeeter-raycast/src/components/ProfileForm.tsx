import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useMemo } from "react";
import { makeId } from "../lib/id";
import { parseGain } from "../lib/target";
import {
  ProfileDefinition,
  ProfileTargetOverride,
  VoicemeeterTarget,
} from "../lib/types";

interface Props {
  profile?: ProfileDefinition;
  targets: VoicemeeterTarget[];
  onSubmitProfile: (profile: ProfileDefinition) => Promise<void>;
}

type FormFieldValue = string | boolean | undefined;

interface FormValues extends Record<string, FormFieldValue> {
  name?: string;
  globalMute?: string;
  globalGain?: string;
  includeConnections?: boolean;
}

interface DefaultValues {
  name: string;
  globalMute: string;
  globalGain: string;
  includeConnections: boolean;
  muteByTargetId: Record<string, string>;
  gainByTargetId: Record<string, string>;
}

function muteChoiceFromBool(value: boolean | undefined): string {
  if (value === true) {
    return "mute";
  }
  if (value === false) {
    return "unmute";
  }
  return "inherit";
}

function boolFromMuteChoice(choice: string): boolean | undefined {
  if (choice === "mute") {
    return true;
  }
  if (choice === "unmute") {
    return false;
  }
  return undefined;
}

function stringValue(value: FormFieldValue): string {
  return typeof value === "string" ? value : "";
}

export function ProfileForm(props: Props) {
  const { pop } = useNavigation();
  const isEditing = Boolean(props.profile);

  const defaults = useMemo(() => {
    const initial: DefaultValues = {
      name: "",
      globalMute: "inherit",
      globalGain: "",
      includeConnections: false,
      muteByTargetId: {},
      gainByTargetId: {},
    };
    const existing = props.profile;

    initial.name = existing?.name ?? "";
    initial.globalMute = muteChoiceFromBool(existing?.global.mute);
    initial.globalGain =
      existing?.global.gain !== undefined ? String(existing.global.gain) : "";
    initial.includeConnections = Boolean(
      existing?.routes && Object.keys(existing.routes).length > 0,
    );

    for (const target of props.targets) {
      const override = target.identityKeys
        .map((key) => existing?.overrides[key])
        .find(Boolean);
      initial.muteByTargetId[target.id] = muteChoiceFromBool(override?.mute);
      initial.gainByTargetId[target.id] =
        override?.gain !== undefined ? String(override.gain) : "";
    }

    return initial;
  }, [props.profile, props.targets]);

  async function onSubmit(values: FormValues) {
    const name = stringValue(values.name).trim();
    if (name.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Profile name is required.",
      });
      return;
    }

    const globalMute = boolFromMuteChoice(stringValue(values.globalMute));
    const rawGlobalGain = stringValue(values.globalGain).trim();
    const globalGain =
      rawGlobalGain.length > 0 ? parseGain(rawGlobalGain) : undefined;
    if (rawGlobalGain.length > 0 && globalGain === undefined) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Global gain is invalid.",
      });
      return;
    }

    const overrides: Record<string, ProfileTargetOverride> = {};
    for (const target of props.targets) {
      const mute = boolFromMuteChoice(stringValue(values[`mute:${target.id}`]));
      const rawGain = stringValue(values[`gain:${target.id}`]).trim();
      const gain = rawGain.length > 0 ? parseGain(rawGain) : undefined;
      if (rawGain.length > 0 && gain === undefined) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Invalid gain for ${target.name}.`,
        });
        return;
      }
      if (mute === undefined && gain === undefined) {
        continue;
      }

      const entry: ProfileTargetOverride = {};
      if (mute !== undefined) {
        entry.mute = mute;
      }
      if (gain !== undefined) {
        entry.gain = gain;
      }

      for (const key of target.identityKeys) {
        overrides[key] = entry;
      }
    }

    const includeConnections = Boolean(values.includeConnections);
    const routes = includeConnections
      ? Object.fromEntries(
          props.targets
            .filter((t) => t.kind === "strip" && t.routes)
            .map((t) => [t.id, t.routes!]),
        )
      : undefined;

    const now = Date.now();
    const profile: ProfileDefinition = {
      id: props.profile?.id ?? makeId(),
      name,
      createdAt: props.profile?.createdAt ?? now,
      updatedAt: now,
      global: {
        mute: globalMute,
        gain: globalGain,
      },
      overrides,
      routes,
    };

    await props.onSubmitProfile(profile);
    pop();
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Profile" : "Create Profile"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Profile" : "Create Profile"}
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        defaultValue={defaults.name}
      />

      <Form.Separator />
      <Form.Description text="Global defaults (applied when no per-target override exists)." />
      <Form.Dropdown
        id="globalMute"
        title="Global Mute"
        defaultValue={defaults.globalMute}
      >
        <Form.Dropdown.Item value="inherit" title="No Change" />
        <Form.Dropdown.Item value="mute" title="Mute" />
        <Form.Dropdown.Item value="unmute" title="Unmute" />
      </Form.Dropdown>
      <Form.TextField
        id="globalGain"
        title="Global Gain (dB)"
        defaultValue={defaults.globalGain}
      />

      <Form.Checkbox
        id="includeConnections"
        title="Include Current Connections"
        label="Save strip-to-bus routing (A1–A5, B1–B3) from current state"
        defaultValue={defaults.includeConnections}
      />

      <Form.Separator />
      <Form.Description text="Per-target overrides (optional)." />

      {props.targets.map((target) => (
        <Form.Dropdown
          key={`mute:${target.id}`}
          id={`mute:${target.id}`}
          title={`${target.name} Mute`}
          defaultValue={defaults.muteByTargetId[target.id]}
        >
          <Form.Dropdown.Item value="inherit" title="Inherit Global" />
          <Form.Dropdown.Item value="mute" title="Mute" />
          <Form.Dropdown.Item value="unmute" title="Unmute" />
        </Form.Dropdown>
      ))}

      {props.targets.map((target) => (
        <Form.TextField
          key={`gain:${target.id}`}
          id={`gain:${target.id}`}
          title={`${target.name} Gain (dB)`}
          defaultValue={defaults.gainByTargetId[target.id]}
        />
      ))}
    </Form>
  );
}
