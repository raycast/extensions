import { ActionPanel, Action, Form, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Org } from "../lib/sf";
import { getOrgMeta, setOrgMeta, type OrgMeta } from "../lib/meta";

export default function EditOrgMeta(props: { org: Org; onSaved?: (meta: OrgMeta) => void }) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  useEffect(() => {
    (async () => {
      const meta = await getOrgMeta(props.org.username);
      setLabel(meta.label ?? "");
      setTagsRaw((meta.tags ?? []).join(", "));
      setLoading(false);
    })();
  }, [props.org.username]);

  async function handleSubmit() {
    const meta: OrgMeta = {
      label: label?.trim() || undefined,
      tags: tagsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    await setOrgMeta(props.org.username, meta);
    props.onSaved?.(meta);
    await showToast(Toast.Style.Success, "Saved", "Metadata updated");
    pop();
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.Description title="Org" text={`${props.org.alias ?? props.org.username} (${props.org.username})`} />
      <Form.TextField id="label" title="Label" value={label} onChange={setLabel} placeholder="Custom display label" />
      <Form.TextField
        id="tags"
        title="Tags"
        value={tagsRaw}
        onChange={setTagsRaw}
        placeholder="Comma-separated e.g. prod, team-a"
      />
    </Form>
  );
}
