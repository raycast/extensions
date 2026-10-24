/**
 * `Traduzir clipboard` — traduz o texto copiado.
 *
 * **Sem idioma configurado, e de propósito.** O par que este comando resolve no dia a dia é
 * português↔inglês, e qual dos dois é o destino depende do texto, não de uma preferência:
 * quem copiou um texto em inglês quer português, e quem copiou em português quer inglês.
 * Um idioma fixo nas preferências erraria metade das vezes, em silêncio. Quem quiser outro
 * idioma diz no argumento do comando, que é onde a exceção custa um segundo.
 *
 * **O desempate mudou junto com a interface.** A detecção continua a mesma, e o par
 * português↔inglês continua indo nos dois sentidos. O que mudou é o caso em que
 * `inferTranslationDirection` não consegue decidir — texto curto ou misto: antes o pedido
 * automático levava para português, agora leva para inglês, que é o idioma do produto.
 */

import type { LaunchProps } from "@raycast/api";
import { type ReactElement } from "react";

import { TextCommand, copyFirstHint } from "./components/text-command";
import { buildUntrustedPrompt, inferTranslationDirection } from "./lib/input-safety";

const COMMAND_TITLE = "Translate Clipboard";
const AUTO = [
  "Translate the text below into English.",
  "If it is already in English, translate it into Brazilian Portuguese.",
].join(" ");
const TAIL = "Answer with **only** the translation: no commentary, and do not repeat the original text.";

type Arguments = { idioma?: string };

export default function Command(props: LaunchProps<{ arguments: Arguments }>): ReactElement {
  const language = (props.arguments?.idioma ?? "").trim();
  const instructionFor = (text: string): string => {
    if (language !== "") return `Translate the text below into ${language}.`;
    const direction = inferTranslationDirection(text).direction;
    if (direction === "pt-en") return "Translate the text below into English.";
    if (direction === "en-pt") return "Translate the text below into Brazilian Portuguese.";
    return AUTO;
  };

  return (
    <TextCommand
      commandTitle={COMMAND_TITLE}
      source="area-de-transferencia"
      buildMessage={(text) => buildUntrustedPrompt(`${instructionFor(text)} ${TAIL}`, text)}
      confirmBeforeSend={(text) => {
        if (language !== "" || inferTranslationDirection(text).direction !== "ambiguous") return undefined;
        return {
          title: "I could not tell the language for sure",
          description:
            "The text is short or mixed. Confirm to ask for the automatic translation, or copy another text and try again.",
        };
      }}
      emptyTitle="Nothing is copied"
      emptyDescription={copyFirstHint()}
    />
  );
}
