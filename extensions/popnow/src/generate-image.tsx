import { GenerateForm } from "./components/generate-form";

export default function Command() {
  return (
    <GenerateForm
      modality="image"
      task="text-to-image"
      defaultModel="google/nano-banana-2.1/text-to-image"
      promptPlaceholder="A paper boat on a rainy window sill, soft morning light"
    />
  );
}
