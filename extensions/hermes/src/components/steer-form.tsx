/**
 * `Orientar execução` (UX-SPEC §6.7) — o formulário, um só para a extensão inteira.
 *
 * Três telas oferecem esta ação (`Perguntar ao Hermes`, o acompanhamento de uma execução e
 * a lista de execuções) e cada uma tinha escrito o seu próprio formulário, com validações e
 * mensagens de erro diferentes. Aqui o componente é PURO: ele valida, envia pelo `onSend`
 * que recebeu e volta. Quem chama decide o transporte, porque as três telas têm fontes de
 * estado diferentes — `useRunStream` já registra a etapa "🧭 Guidance sent" no fio,
 * enquanto as outras duas só têm o `run_id`.
 *
 * Armadilha 22: o servidor só aceita orientação com o estado EXATAMENTE `running`; fora
 * disso devolve 409, que vira a frase E13 abaixo.
 */

import { Action, ActionPanel, Form, Icon, Toast, showHUD, showToast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import type { ReactElement } from "react";
import { toHermesError } from "../lib/errors";
import { steerRun } from "../lib/hermes-api";

/** E14 — literal da UX-SPEC §5.2. */
const EMPTY_TEXT = "Write your guidance before sending.";
/** E13 — literal da UX-SPEC §5.2, para o 409 sem `code` reconhecível. */
const NOT_RUNNING_TEXT = "This task cannot be guided right now. That only works while it is working.";

/**
 * Envia a orientação e dá o retorno visível ao usuário. É o transporte padrão para quem só
 * tem o `run_id`; `errors.ts` já traduz o 409 com `code` conhecido para a mesma frase E13,
 * e o `httpStatus` cobre o caso em que o servidor não manda `code`.
 */
export async function steerAndReport(runId: string, text: string): Promise<void> {
  try {
    await steerRun(runId, text);
    await showHUD("Guidance sent");
  } catch (err) {
    const error = toHermesError(err, `POST /v1/runs/${runId}/steer`);
    await showToast({
      style: Toast.Style.Failure,
      title: error.httpStatus === 409 ? NOT_RUNNING_TEXT : error.userMessage,
    });
  }
}

export interface SteerFormProps {
  /** Envia o texto já aparado. Erros de rede são responsabilidade de quem envia. */
  onSend: (text: string) => Promise<void>;
}

export function SteerForm({ onSend }: SteerFormProps): ReactElement {
  const { pop } = useNavigation();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  /** Trava síncrona: um segundo Enter antes da resposta mandaria duas orientações. */
  const busy = useRef(false);

  async function submit(): Promise<void> {
    if (busy.current) return;
    if (text.trim() === "") {
      setError(EMPTY_TEXT);
      return;
    }
    busy.current = true;
    try {
      await onSend(text.trim());
      pop();
    } finally {
      busy.current = false;
    }
  }

  return (
    <Form
      navigationTitle="Guide the Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Guidance" icon={Icon.Compass} onSubmit={() => void submit()} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="orientacao"
        title="What Do You Want to Adjust"
        placeholder="E.g. be briefer and focus on the cost."
        autoFocus
        value={text}
        error={error}
        onChange={(value) => {
          setText(value);
          if (error !== undefined) setError(undefined);
        }}
      />
    </Form>
  );
}
