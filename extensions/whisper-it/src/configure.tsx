import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { setConfig, Configuration, DEFAULT_CONFIG } from "./config";

export default function Command() {
  async function handleSubmit(values: Configuration) {
    await setConfig(values);
    showToast({ title: "Configuration saved", message: "Your settings have been updated" });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure Whisper Transcription Settings" />

      <Form.Dropdown id="model" title="Whisper Model" defaultValue={DEFAULT_CONFIG.model}>
        <Form.Dropdown.Item value="tiny.en" title="Tiny (English)" />
        <Form.Dropdown.Item value="base.en" title="Base (English)" />
        <Form.Dropdown.Item value="small.en" title="Small (English)" />
        <Form.Dropdown.Item value="medium" title="Medium (Multilingual)" />
        <Form.Dropdown.Item value="medium.en" title="Medium (English)" />
        <Form.Dropdown.Item value="large-v3" title="Large v3 (Multilingual)" />
        <Form.Dropdown.Item value="large-v3-turbo" title="Large v3 Turbo (Multilingual)" />
      </Form.Dropdown>

      <Form.TextField
        id="pythonPath"
        title="Python Executable Path"
        placeholder="/usr/local/bin/python"
        defaultValue={DEFAULT_CONFIG.pythonPath}
      />

      <Form.TextField
        id="pipPath"
        title="Pip Executable Path"
        placeholder="/usr/local/bin/pip"
        defaultValue={DEFAULT_CONFIG.pipPath}
      />

      <Form.TextField
        id="audioStoragePath"
        title="Audio Storage Path"
        placeholder="/path/to/audio/storage"
        defaultValue={DEFAULT_CONFIG.audioStoragePath}
      />

      <Form.Checkbox
        id="keepAudioFiles"
        label="Keep audio files after transcription"
        title="Storage"
        defaultValue={DEFAULT_CONFIG.keepAudioFiles}
      />

      <Form.Checkbox
        id="pasteTranscription"
        label="Automatically paste transcription (otherwise copy to clipboard)"
        title="Clipboard Behavior"
        defaultValue={DEFAULT_CONFIG.pasteTranscription}
      />

      <Form.Dropdown id="audioExtension" title="Audio Format" defaultValue={DEFAULT_CONFIG.audioExtension}>
        <Form.Dropdown.Item value="mp3" title="MP3" />
        <Form.Dropdown.Item value="wav" title="WAV" />
      </Form.Dropdown>
    </Form>
  );
}
