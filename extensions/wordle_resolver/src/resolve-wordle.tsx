import { WordGameComponent } from "./lib/WordGameComponent";
import { englishConfig } from "./lib/english.config";

export default function Command() {
  return <WordGameComponent config={englishConfig} />;
}
