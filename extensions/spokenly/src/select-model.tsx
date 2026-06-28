import ModelList from "./model-list";

export default function SelectModel() {
  return (
    <ModelList
      prefKey="transcriptionModelID"
      searchPlaceholder="Search dictation models..."
      selectTitle="Use for Dictation"
      hudMessage={(label) =>
        `Dictation model: ${label} (active next dictation)`
      }
    />
  );
}
