import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { useState } from "react";
import type { SoundSlot } from "./lib/event";
import {
  importSoundFile,
  loadInstallStatus,
  loadSoundLibrary,
  loadSoundMappings,
  previewSoundFile,
  repairUserData,
  resolveManagedSoundPath,
  saveSoundMappings,
  type SoundMapping,
  type SoundMappings,
} from "./lib/sound-store";

type SemanticHook = {
  id: SoundSlot;
  title: string;
  description: string;
  providers: string;
  hookKeys: string[];
};

type HookSoundFormValues = {
  enabled: boolean;
  soundId: string;
  source?: string[];
};

const SEMANTIC_HOOKS: SemanticHook[] = [
  {
    id: "needs_input",
    title: "Needs Input",
    description:
      "Play this sound when an AI needs your attention or asks you to respond.",
    providers: "Claude, Gemini",
    hookKeys: [
      "claude:elicitation",
      "gemini:notification",
      "gemini:needs_input",
    ],
  },
  {
    id: "done",
    title: "Done",
    description: "Play this sound when an AI finishes the current task.",
    providers: "Claude, Gemini",
    hookKeys: ["claude:stop", "gemini:afteragent", "gemini:done"],
  },
];

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(loadManageSoundsData, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Manage AI hook sounds">
      <List.Section title="Install Health">
        <List.Item
          icon={{
            source: data?.status.healthy ? Icon.CheckCircle : Icon.Warning,
            tintColor: data?.status.healthy ? Color.Green : Color.Orange,
          }}
          title={
            data?.status.healthy
              ? "Managed sound data is healthy"
              : "Managed sound data needs repair"
          }
          subtitle={installHealthSubtitle(data?.status.missing ?? [])}
          actions={
            <ActionPanel>
              <Action
                title="Repair Managed Sound Data"
                icon={Icon.Wrench}
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: "Repairing managed sound data",
                  });
                  const repaired = await repairUserData();
                  await revalidate();
                  await showToast({
                    style: repaired.status.healthy
                      ? Toast.Style.Success
                      : Toast.Style.Failure,
                    title: repaired.status.healthy
                      ? "Managed sound data repaired"
                      : "Managed sound data still needs attention",
                    message: repaired.status.healthy
                      ? undefined
                      : installHealthSubtitle(repaired.status.missing),
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Configured Hooks">
        {SEMANTIC_HOOKS.map((hook) => {
          const mapping = resolveSemanticMapping(data?.mappings, hook);
          const sound = data?.libraryById.get(mapping?.soundId ?? "");

          return (
            <List.Item
              key={hook.id}
              icon={iconForSemanticHook(hook.id, Boolean(mapping?.enabled))}
              title={hook.title}
              subtitle={soundSubtitle(mapping, sound?.label)}
              accessories={[
                { tag: { value: hook.providers, color: Color.SecondaryText } },
                ...hookAccessories(mapping, sound?.label),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Configure Hook Sound"
                    icon={Icon.Music}
                    target={
                      <HookSoundForm
                        hook={hook}
                        onSaved={async () => {
                          await revalidate();
                        }}
                      />
                    }
                  />
                  {sound ? (
                    <Action
                      title="Preview Current Sound"
                      icon={Icon.Play}
                      onAction={() =>
                        previewSoundFile(
                          resolveManagedSoundPath(sound.filename),
                        )
                      }
                    />
                  ) : null}
                  <Action
                    title={
                      mapping?.enabled
                        ? "Mute Hook"
                        : sound
                          ? "Enable Hook"
                          : "Choose Sound to Enable"
                    }
                    icon={
                      mapping?.enabled
                        ? Icon.SpeakerOff
                        : sound
                          ? Icon.SpeakerOn
                          : Icon.Music
                    }
                    onAction={async () => {
                      if (!data) return;

                      if (!mapping?.enabled && !sound) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Choose a sound before enabling this hook",
                        });
                        return;
                      }

                      const updatedMappings = applySemanticMapping(
                        data.mappings,
                        hook,
                        {
                          enabled: !mapping?.enabled,
                          soundId: mapping?.soundId ?? null,
                        },
                      );

                      await saveSoundMappings(updatedMappings);
                      await revalidate();
                      await showToast({
                        style: Toast.Style.Success,
                        title: !mapping?.enabled
                          ? `${hook.title} enabled`
                          : `${hook.title} muted`,
                      });
                    }}
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

function HookSoundForm(props: {
  hook: SemanticHook;
  onSaved: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [selectedSoundId, setSelectedSoundId] = useState<string | undefined>();
  const { data, isLoading } = usePromise(async () => {
    const [library, mappings] = await Promise.all([
      loadSoundLibrary(),
      loadSoundMappings(),
    ]);

    return {
      library,
      mappings,
      current: resolveSemanticMapping(mappings, props.hook),
    };
  }, [props.hook.id]);

  const currentSound = data?.library.sounds.find(
    (sound) => sound.id === data.current?.soundId,
  );

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Configure ${props.hook.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Hook Sound"
            icon={Icon.CheckCircle}
            onSubmit={async (values: HookSoundFormValues) => {
              if (!data) return;
              let soundId =
                values.soundId === "__none__" ? null : values.soundId || null;

              if (values.soundId === "__import__") {
                const sourcePath = values.source?.[0];
                if (!sourcePath) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Choose an audio file to import",
                  });
                  return;
                }

                const imported = await importSoundFile(
                  sourcePath,
                  basename(sourcePath),
                );
                soundId = imported.id;
              }

              if (values.enabled && !soundId) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose an audio file for this hook",
                });
                return;
              }

              const updatedMappings = applySemanticMapping(
                data.mappings,
                props.hook,
                {
                  enabled: values.enabled,
                  soundId,
                },
              );

              await saveSoundMappings(updatedMappings);
              await props.onSaved();
              await showToast({
                style: Toast.Style.Success,
                title: `${props.hook.title} updated`,
                message: soundId ? "Hook sound saved" : "Hook muted",
              });
              pop();
            }}
          />
          {currentSound ? (
            <Action
              title="Preview Current Sound"
              icon={Icon.Play}
              onAction={() =>
                previewSoundFile(resolveManagedSoundPath(currentSound.filename))
              }
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description title="Semantic Hook" text={props.hook.description} />
      <Form.Description title="Applies To" text={props.hook.providers} />
      <Form.Checkbox
        id="enabled"
        title="Enable Sound"
        label="Play audio for this semantic hook"
        defaultValue={data?.current?.enabled ?? false}
      />
      <Form.Dropdown
        id="soundId"
        title="Audio Source"
        info="Choose an existing audio file, or select Import from local file."
        defaultValue={data?.current?.soundId ?? "__none__"}
        onChange={setSelectedSoundId}
      >
        <Form.Dropdown.Item value="__none__" title="No audio selected" />
        <Form.Dropdown.Section title="Bundled Audio">
          {(data?.library.sounds ?? [])
            .filter((sound) => sound.kind === "bundled")
            .map((sound) => (
              <Form.Dropdown.Item
                key={sound.id}
                value={sound.id}
                title={sound.label}
              />
            ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Imported Audio">
          {(data?.library.sounds ?? [])
            .filter((sound) => sound.kind === "imported")
            .map((sound) => (
              <Form.Dropdown.Item
                key={sound.id}
                value={sound.id}
                title={sound.originalName ?? sound.label}
              />
            ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Actions">
          <Form.Dropdown.Item
            value="__import__"
            title="Import from local file..."
          />
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {(selectedSoundId ?? data?.current?.soundId ?? "__none__") ===
      "__import__" ? (
        <Form.FilePicker
          id="source"
          title="Audio File"
          allowMultipleSelection={false}
        />
      ) : null}
    </Form>
  );
}

async function loadManageSoundsData() {
  let status = await loadInstallStatus();
  if (!status.healthy) {
    await repairUserData();
    status = await loadInstallStatus();
  }

  const [mappings, library] = await Promise.all([
    loadSoundMappings(),
    loadSoundLibrary(),
  ]);

  return {
    mappings,
    library,
    status,
    libraryById: new Map(library.sounds.map((sound) => [sound.id, sound])),
  };
}

function applySemanticMapping(
  mappings: SoundMappings,
  hook: SemanticHook,
  mapping: SoundMapping,
): SoundMappings {
  return {
    ...mappings,
    slots: {
      ...mappings.slots,
      [hook.id]: mapping,
    },
    hooks: {
      ...mappings.hooks,
      ...Object.fromEntries(hook.hookKeys.map((hookKey) => [hookKey, mapping])),
    },
  };
}

function resolveSemanticMapping(
  mappings: SoundMappings | undefined,
  hook: SemanticHook,
): SoundMapping | undefined {
  if (!mappings) return undefined;

  for (const hookKey of hook.hookKeys) {
    const mapping = mappings.hooks[hookKey];
    if (mapping) return mapping;
  }

  return mappings.slots[hook.id];
}

function installHealthSubtitle(missing: string[]) {
  if (missing.length === 0) return "All managed sound files are installed";
  if (missing.length === 1) return "Missing 1 required item";
  return `Missing ${missing.length} required items`;
}

function soundSubtitle(
  mapping: SoundMapping | undefined,
  soundLabel: string | undefined,
) {
  if (!mapping?.enabled) return "Muted";
  if (soundLabel) return soundLabel;
  return "Enabled with no sound assigned";
}

function hookAccessories(
  mapping: SoundMapping | undefined,
  soundLabel: string | undefined,
) {
  if (!mapping?.enabled) {
    return [{ tag: { value: "Muted", color: Color.SecondaryText } }];
  }

  if (!soundLabel) {
    return [{ tag: { value: "No Sound", color: Color.Orange } }];
  }

  return [{ tag: { value: "Enabled", color: Color.Green } }];
}

function iconForSemanticHook(slot: SoundSlot, enabled: boolean) {
  if (!enabled) {
    return { source: Icon.SpeakerOff, tintColor: Color.SecondaryText };
  }

  if (slot === "needs_input") {
    return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
  }

  return { source: Icon.CheckCircle, tintColor: Color.Green };
}
