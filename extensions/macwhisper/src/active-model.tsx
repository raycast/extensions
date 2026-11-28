import { Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { errorMessage, listModels, Model, openMacWhisper, selectModel } from "./lib/mw";

async function launch(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showHUD(`Could not open the command: ${errorMessage(error)}`);
  }
}

async function openApp() {
  try {
    await openMacWhisper();
  } catch (error) {
    await showHUD(errorMessage(error));
  }
}

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
          onAction={() => launch("transcribe-latest-recording")}
        />
        <MenuBarExtra.Item title="Transcribe File…" icon={Icon.Document} onAction={() => launch("transcribe-file")} />
        <MenuBarExtra.Item title="Open MacWhisper" icon={Icon.AppWindow} onAction={openApp} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
