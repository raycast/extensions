import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { loadQuickSettings, saveQuickSettings } from "../lib/settings";
import {
  MuteBehavior,
  QuickSettings,
  SectionOrder,
  VolumePrimaryAction,
} from "../lib/types";

interface FormValues {
  muteBehavior: MuteBehavior;
  undoTtlSeconds: string;
  voicemeeterExecutablePath: string;
  increaseStep: string;
  decreaseStep: string;
  volumePrimaryAction: VolumePrimaryAction;
  sectionOrder: SectionOrder;
}

interface Props {
  onSaved?: () => Promise<void> | void;
}

export function QuickSettingsForm(props: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<QuickSettings>({});

  useEffect(() => {
    const run = async () => {
      const settings = await loadQuickSettings();
      setInitialValues(settings);
      setIsLoading(false);
    };
    void run();
  }, []);

  async function onSubmit(values: FormValues) {
    const undo = Number(values.undoTtlSeconds);
    if (!Number.isFinite(undo) || undo < 1 || undo > 300) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo TTL must be between 1 and 300 seconds.",
      });
      return;
    }

    const incStep = Number(values.increaseStep);
    const decStep = Number(values.decreaseStep);
    if (
      !Number.isFinite(incStep) ||
      incStep < 0.1 ||
      incStep > 12 ||
      !Number.isFinite(decStep) ||
      decStep < 0.1 ||
      decStep > 12
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Volume steps must be between 0.1 and 12 dB.",
      });
      return;
    }

    await saveQuickSettings({
      muteBehavior: values.muteBehavior,
      undoTtlSeconds: Math.round(undo),
      voicemeeterExecutablePath:
        values.voicemeeterExecutablePath.trim() || undefined,
      increaseStep: Math.round(incStep * 100) / 100,
      decreaseStep: Math.round(decStep * 100) / 100,
      volumePrimaryAction: values.volumePrimaryAction,
      sectionOrder: values.sectionOrder,
    });
    await showToast({
      style: Toast.Style.Success,
      title: "Quick settings saved",
    });

    if (props.onSaved) {
      await props.onSaved();
    }

    pop();
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Quick Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="muteBehavior"
        title="Mute Behavior"
        defaultValue={initialValues.muteBehavior ?? "optimistic-toggle"}
      >
        <Form.Dropdown.Item
          value="optimistic-toggle"
          title="Optimistic Toggle"
        />
        <Form.Dropdown.Item
          value="refresh-then-toggle"
          title="Refresh Then Toggle"
        />
        <Form.Dropdown.Item
          value="explicit-idempotent"
          title="Explicit Idempotent"
        />
      </Form.Dropdown>

      <Form.TextField
        id="undoTtlSeconds"
        title="Undo TTL (seconds)"
        defaultValue={String(initialValues.undoTtlSeconds ?? 10)}
      />
      <Form.TextField
        id="voicemeeterExecutablePath"
        title="Voicemeeter Executable Path"
        placeholder="C:\\Program Files\\VB\\Voicemeeter\\voicemeeter8.exe"
        defaultValue={initialValues.voicemeeterExecutablePath ?? ""}
      />
      <Form.Separator />
      <Form.TextField
        id="increaseStep"
        title="Volume Increase Step (dB)"
        defaultValue={String(initialValues.increaseStep ?? 1)}
      />
      <Form.TextField
        id="decreaseStep"
        title="Volume Decrease Step (dB)"
        defaultValue={String(initialValues.decreaseStep ?? 1)}
      />
      <Form.Dropdown
        id="volumePrimaryAction"
        title="Primary Hotkey (Enter)"
        defaultValue={initialValues.volumePrimaryAction ?? "increase"}
      >
        <Form.Dropdown.Item value="increase" title="Increase Volume" />
        <Form.Dropdown.Item value="decrease" title="Decrease Volume" />
      </Form.Dropdown>
      <Form.Dropdown
        id="sectionOrder"
        title="Section Order"
        defaultValue={initialValues.sectionOrder ?? "buses-first"}
      >
        <Form.Dropdown.Item value="strips-first" title="Strips First" />
        <Form.Dropdown.Item value="buses-first" title="Buses First" />
      </Form.Dropdown>
    </Form>
  );
}
