/**
 * `Corrigir texto do clipboard` — corrige o texto copiado e devolve só o texto corrigido.
 *
 * A instrução proíbe comentário de propósito: quem usa este comando quer colar o resultado
 * no lugar do original (`Ctrl+Shift+V` / `Cmd+Shift+V`, dentro da conversa), e um "aqui está a versão
 * corrigida:" antes do texto teria de ser apagado à mão toda vez.
 */

import { type ReactElement } from "react";

import { TextCommand, copyFirstHint } from "./components/text-command";
import { buildUntrustedPrompt } from "./lib/input-safety";

const COMMAND_TITLE = "Fix Clipboard Text";
const INSTRUCTION = [
  "Fix the spelling, grammar and punctuation of the text below, keeping its meaning, its tone and its original language.",
  "Answer with **only** the corrected text: no commentary, no explanation, no quotes around it.",
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
