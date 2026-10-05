/**
 * `Renomear conversa` (UX-SPEC §2.2 e §2.3) — um formulário só para as três telas que
 * oferecem a ação (lista de conversas, detalhe da conversa e a tela de resposta do
 * `Perguntar ao Hermes`). Antes eram dois, com validações diferentes: um deles nem
 * checava o limite de 100 caracteres e tratava a colisão de título como falha de sistema.
 *
 * Títulos são ÚNICOS no banco INTEIRO (R7 / armadilha 6): repetir devolve 400
 * `invalid_title`, que `errors.ts` já traduz para a frase E11 da UX-SPEC. Aqui ele é
 * tratado como erro de campo — o formulário continua aberto com o texto digitado — e não
 * como falha de sistema, que jogaria o usuário para fora sem o que ele escreveu.
 */

import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import type { ReactElement } from "react";
import { toHermesError } from "../lib/errors";
import { updateSession } from "../lib/hermes-api";
import type { Session } from "../lib/types";
import { OpenPreferencesAction, SYNC_PROMISE } from "./common";

const MAX_TITLE_LENGTH = 100;

interface RenameValues extends Form.Values {
  titulo: string;
}

/**
 * Títulos são ÚNICOS no banco INTEIRO (R7 / armadilha 6): repetir devolve 400
 * `invalid_title`, que `errors.ts` já traduz para a frase E11 da UX-SPEC. Aqui ele é
 * tratado como erro de campo — o formulário continua aberto com o texto digitado — e não
 * como falha de sistema, que jogaria o usuário para fora sem o que ele escreveu.
 */
export function RenameSessionForm({
  session,
  onRenamed,
}: {
  session: Pick<Session, "id" | "title">;
  onRenamed?: (session: Session) => void;
}): ReactElement {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);

  const { handleSubmit, itemProps, setValidationError } = useForm<RenameValues>({
    initialValues: { titulo: session.title ?? "" },
    validation: {
      titulo: (value) => {
        const title = (value ?? "").trim();
        if (title === "") return "Write a name for the conversation.";
        if (title.length > MAX_TITLE_LENGTH) return `Pick a shorter name: up to ${MAX_TITLE_LENGTH} characters.`;
        return undefined;
      },
    },
    async onSubmit(values) {
      setIsSaving(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Renomeando…" });
      try {
        const { session: updated } = await updateSession(session.id, { title: values.titulo.trim() });
        toast.style = Toast.Style.Success;
        toast.title = "Conversation Renamed";
        onRenamed?.(updated);
        pop();
      } catch (err) {
        const error = toHermesError(err, "updateSession");
        await toast.hide();
        // E11: colisão de título. O usuário só precisa escolher outro nome.
        if (error.uxId === "E11") {
          setValidationError("titulo", error.userMessage);
        } else {
          await showToast({ style: Toast.Style.Failure, title: error.userMessage });
        }
      } finally {
        setIsSaving(false);
      }
    },
  });

  return (
    <Form
      navigationTitle="Rename Conversation"
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save New Name" icon={Icon.Check} onSubmit={handleSubmit} />
          <OpenPreferencesAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.titulo}
        title="Conversation Name"
        placeholder="E.g. Summary of the August report"
        info="Every Hermes conversation needs a name different from all the others."
        autoFocus
      />
      <Form.Description
        title="Where This Shows Up"
        text={`The new name shows up here and in Hermes Desktop. ${SYNC_PROMISE}`}
      />
    </Form>
  );
}
