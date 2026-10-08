import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  showToast,
  Toast,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { useState } from "react";

// "Crear" delega en el motor de captura de From (deep link from://capture).
// From decide si es nota, tarea o evento, le pone fecha y aplica @contextos
// escritos en el texto — la misma inteligencia que el icono de la barra de
// menús y el Atajo de Apple. Requiere la app de From para Mac.
export default function CreateCommand() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const value = text.trim();
    if (!value) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Type something first",
      });
      return;
    }
    setLoading(true);
    try {
      const url = `from://capture?text=${encodeURIComponent(value)}&silent=1`;
      await open(url);
      await showToast({ style: Toast.Style.Success, title: "✓ Sent to From" });
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not reach From",
        message: String(e),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send to from"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Capture"
        placeholder="Write the way you think… From figures out if it's a note, task or event"
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Description text="From detects the type, date and @contexts from your text — no need to pick anything." />
    </Form>
  );
}
