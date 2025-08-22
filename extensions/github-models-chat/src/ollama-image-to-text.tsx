import { Creativity } from "./lib/enum";
import { OllamaApiModelCapability } from "./lib/ollama/enum";
import { CommandAnswer } from "./lib/settings/enum";
import { AnswerView } from "./lib/ui/AnswerView/main";

export default function Command(): JSX.Element {
  const p = "Extract all the text from the following images. {image}\n";
  return (
    <AnswerView
      command={CommandAnswer.IMAGE_TO_TEXT}
      prompt={p}
      creativity={Creativity.Low}
      capabilities={[OllamaApiModelCapability.VISION]}
    />
  );
}
