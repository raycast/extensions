import { GenerateForm } from "./components/generate-form";

export default function Command() {
  return (
    <GenerateForm
      modality="video"
      task="text-to-video"
      defaultModel="minimax/h3/text-to-video"
      promptPlaceholder="A vintage car on a coast road at golden hour, slow tracking shot"
    />
  );
}
