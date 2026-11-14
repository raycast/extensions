import { showFailureToast } from "@raycast/utils";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useRef, useState } from "react";
import { activityIcons, createId, type Card } from "daily-karte";
import { getSession } from "./auth";
import { FirestoreClient, type Versioned } from "./lib/firestore";
import { cardFromValues, type CardValues } from "./lib/forms";
import { activityIcon, ErrorView, useLoad } from "./components";

export interface CardFormProps {
  uid: string;
  projectId: string;
  onSaved: (card: Card) => void;
}

function CardForm({ previous, uid, projectId, onSaved }: CardFormProps & { previous?: Versioned<Card> }) {
  const { pop } = useNavigation();
  const card = previous?.record;
  const id = useRef(card?.id ?? createId());
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [icon, setIcon] = useState(card?.icon.startsWith("emoji:") ? "custom" : (card?.icon ?? "sparkles"));
  async function submit(values: CardValues) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const next = cardFromValues(id.current, values);
      const session = await getSession();
      if (session.uid !== uid || session.config.projectId !== projectId)
        throw new Error("The account changed. Reopen Activities before saving.");
      await new FirestoreClient(session).saveCard(next, previous);
      await showToast({
        style: Toast.Style.Success,
        title: previous ? "Activity Card Updated" : "Activity Card Created",
        message: next.name,
      });
      onSaved(next);
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Activity Card Was Not Confirmed" });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <Form
      navigationTitle={previous ? "Edit Activity Card" : "New Activity Card"}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Activity Card" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={card?.name ?? ""}
        placeholder="Choose a short activity name"
      />
      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {activityIcons.map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={value}
            title={value.charAt(0).toUpperCase() + value.slice(1)}
            icon={activityIcon({ icon: value, color: card?.color ?? "sage" })}
          />
        ))}
        <Form.Dropdown.Item value="custom" title="Emoji or Symbol" />
      </Form.Dropdown>
      {icon === "custom" && (
        <Form.TextField
          id="emoji"
          title="Emoji or Symbol"
          defaultValue={card?.icon.startsWith("emoji:") ? card.icon.slice(6) : ""}
          placeholder="🎨"
        />
      )}
      <Form.Dropdown id="color" title="Color" defaultValue={card?.color ?? "sage"}>
        {(["sage", "amber", "rose", "blue", "lavender"] as Card["color"][]).map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={value}
            title={value.charAt(0).toUpperCase() + value.slice(1)}
            icon={activityIcon({ icon: "sun", color: value })}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="duration"
        title="Default Duration in Minutes"
        defaultValue={card?.duration == null ? "" : String(card.duration)}
        placeholder="Leave blank for no estimate"
      />
      <Form.Description text="These defaults apply to future recordings. Saved activities keep their historical details." />
    </Form>
  );
}

export function NewCard(props: CardFormProps) {
  return <CardForm {...props} />;
}

export function EditCard({ id, ...props }: CardFormProps & { id: string }) {
  const loader = useCallback(async () => {
    const session = await getSession();
    if (session.uid !== props.uid || session.config.projectId !== props.projectId)
      throw new Error("The account changed. Reopen Activities.");
    return new FirestoreClient(session).cardSnapshot(id);
  }, [id, props.uid, props.projectId]);
  const state = useLoad(loader);
  if (state.error) return <ErrorView error={state.error} refresh={state.refresh} />;
  if (!state.value) return <Form isLoading />;
  return <CardForm {...props} previous={state.value} />;
}
