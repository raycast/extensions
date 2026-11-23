import { Icon, launchCommand, LaunchType, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { errorMessage, listModels, MACWHISPER_BUNDLE_ID, Model, selectModel } from "./lib/mw";

export default function Command() {
  const { data: models = [], isLoading, error, revalidate } = useCachedPromise(listModels);
  const active = models.find((model) => model.active);

  async function activate(model: Model) {
    try {
      await selectModel(model.id);
      await showHUD(`Switched to ${model.name}`);
      await revalidate();
    } catch (selectError) {
      await showHUD(`Could not switch model: ${errorMessage(selectError)}`);
    }
  }

  return (
    <MenuBarExtra
      icon={Icon.Microphone}
      title={active?.name}
      tooltip={active ? `MacWhisper model: ${active.name}` : "MacWhisper"}
      isLoading={isLoading}
    >
      {error && <MenuBarExtra.Item title={`MacWhisper unavailable: ${errorMessage(error)}`} />}
      <MenuBarExtra.Section title="Transcription Model">
        {models.map((model) => (
          <MenuBarExtra.Item
            key={model.id}
            icon={model.active ? Icon.CheckCircle : Icon.Circle}
            title={model.name}
            subtitle={model.size}
            onAction={model.active ? undefined : () => activate(model)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Transcribe Latest Recording"
          icon={Icon.Clock}
          onAction={() => launchCommand({ name: "transcribe-latest-recording", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Transcribe File…"
          icon={Icon.Document}
          onAction={() => launchCommand({ name: "transcribe-file", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Open MacWhisper" icon={Icon.AppWindow} onAction={() => open(MACWHISPER_BUNDLE_ID)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
