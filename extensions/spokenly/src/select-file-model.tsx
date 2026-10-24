import ModelList from "./model-list";

export default function SelectFileModel() {
  return (
    <ModelList
      prefKey="fileTranscriptionVoiceModelID"
      searchPlaceholder="Search file transcription models..."
      selectTitle="Use for File Transcription"
      hudMessage={(label) => `File transcription model: ${label}`}
    />
  );
}
