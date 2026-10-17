/**
 * `Resumir clipboard` — resume o texto copiado, sem tela intermediária.
 *
 * A instrução pede tópicos porque é o formato que sobrevive à leitura de relance no painel
 * da conversa; um parágrafo corrido exigiria ler tudo para achar o que interessa.
 */

import { type ReactElement } from "react";

import { TextCommand, copyFirstHint } from "./components/text-command";
import { buildUntrustedPrompt } from "./lib/input-safety";

const COMMAND_TITLE = "Summarize Clipboard";
const INSTRUCTION = [
  "Summarize the text below in English.",
  "Start with one sentence saying what it is about, then give up to 5 bullet points with what matters.",
  "Do not make up anything that is not in the text.",
].join(" ");

export default function Command(): ReactElement {
  return (
    <TextCommand
      commandTitle={COMMAND_TITLE}
      source="area-de-transferencia"
      buildMessage={(text) => buildUntrustedPrompt(INSTRUCTION, text)}
      emptyTitle="Nothing is copied"
      emptyDescription={copyFirstHint()}
    />
  );
}
