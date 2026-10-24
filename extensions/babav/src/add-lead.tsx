import { Action, ActionPanel, Clipboard, Form, getSelectedText, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { api, parseLeadText, Person, showError } from "./api";
import { withConnection } from "./connect";

type Values = { name: string; email: string; phone: string; company: string; notes: string };

function AddLead() {
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("");
  const [v, setV] = useState<Values>({ name: "", email: "", phone: "", company: "", notes: "" });

  useEffect(() => {
    (async () => {
      let text = "";
      let from = "";
      try {
        text = (await getSelectedText()).trim();
        from = "selection";
      } catch {
        text = "";
      }
      if (!text) {
        text = ((await Clipboard.readText()) || "").trim();
        from = text ? "clipboard" : "";
      }
      const p = parseLeadText(text);
      setV({ ...p, notes: "" });
      setSource(from);
      setLoading(false);
    })();
  }, []);

  async function submit(values: Values) {
    if (!values.email.trim() && !values.phone.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Add an email or a phone number" });
      return;
    }
    const t = await showToast({ style: Toast.Style.Animated, title: "Saving lead…" });
    try {
      const r = await api<{ created: boolean; lead: Person }>("/leads", { method: "POST", body: values });
      t.style = Toast.Style.Success;
      t.title = r.created ? "Lead saved" : "Already in BABAV — updated";
      t.message = r.lead.name || r.lead.email || r.lead.phone;
      await popToRoot();
    } catch (e) {
      t.hide();
      await showError(e, "Could not save the lead");
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Add Lead"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Lead" icon={Icon.PersonCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {source ? <Form.Description text={`Filled from your ${source}. Check it, then press ⌘↵ / Ctrl+Enter.`} /> : null}
      <Form.TextField id="name" title="Name" value={v.name} onChange={(name) => setV({ ...v, name })} />
      <Form.TextField id="email" title="Email" value={v.email} onChange={(email) => setV({ ...v, email })} />
      <Form.TextField
        id="phone"
        title="Phone"
        value={v.phone}
        onChange={(phone) => setV({ ...v, phone })}
        info="Saved to your people only. BABAV never texts a number you add here unless they opt in."
      />
      <Form.TextField id="company" title="Company" value={v.company} onChange={(company) => setV({ ...v, company })} />
      <Form.TextArea id="notes" title="Notes" value={v.notes} onChange={(notes) => setV({ ...v, notes })} />
    </Form>
  );
}

export default withConnection(AddLead);
