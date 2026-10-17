/**
 * `Perguntar sobre seleção` — pega o texto selecionado (ou o que estiver copiado) e abre a
 * conversa já perguntando sobre ele.
 *
 * O argumento `pergunta` é o que muda entre "o que é isto?" e uma pergunta de verdade. Sem
 * ele, a pergunta padrão é deliberadamente aberta: quem aciona este comando sobre um trecho
 * quase sempre quer entender o trecho.
 */

import type { LaunchProps } from "@raycast/api";
import { type ReactElement } from "react";

import { TextCommand } from "./components/text-command";
import { buildUntrustedPrompt } from "./lib/input-safety";
import { platformCopy } from "./lib/platform";

const COMMAND_TITLE = "Ask About Selection";
const DEFAULT_QUESTION = "Explain this text in English, simply and directly.";

type Arguments = { pergunta?: string };

export default function Command(props: LaunchProps<{ arguments: Arguments }>): ReactElement {
  const question = (props.arguments?.pergunta ?? "").trim();
  const copy = platformCopy();

  return (
    <TextCommand
      commandTitle={COMMAND_TITLE}
      source="selecao"
      buildMessage={(text) => buildUntrustedPrompt(question === "" ? DEFAULT_QUESTION : question, text)}
      emptyTitle="I did not find any text"
      emptyDescription={[
        "Select a passage in the window you were in, or copy the text, and run this command again.",
        "",
        `Not every app hands the selection to the system. When that happens, copying (\`${copy.copyKeys}\`) always works.`,
      ].join("\n")}
    />
  );
}
