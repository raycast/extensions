import { Wordle } from "@src/components";
import { Language } from "@src/types";

export default function play_en_US() {
  return <Wordle language={Language.ENGLISH_US} />;
}
