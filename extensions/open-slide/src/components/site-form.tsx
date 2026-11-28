import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addSite, defaultLabel, listSites, normalizeBase } from "../lib/sites";
import { loadSite } from "../lib/slides";

type Props = { onAdded: () => void };

export function SiteForm({ onAdded }: Props) {
  const { pop } = useNavigation();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  async function submit() {
    setError(undefined);
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking URL…" });
    try {
      const base = normalizeBase(url);
      // Checked up front: `addSite` catches this too, but only after a scan
      // that crawls every deck on a site we already have.
      if ((await listSites()).some((site) => site.base === base)) {
        throw new Error("That site has already been added");
      }
      // Adding is only worth it if the site actually parses — scan before saving.
      const decks = await loadSite({ id: "probe", base, label: label || defaultLabel(base), addedAt: 0 });
      await addSite(base, label);
      toast.style = Toast.Style.Success;
      toast.title = `Added ${defaultLabel(base)}`;
      toast.message = `Found ${decks.length} ${decks.length === 1 ? "slide" : "slides"}`;
      onAdded();
      pop();
    } catch (err) {
      toast.hide();
      setError(err instanceof Error ? err.message : "Couldn't add this site");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Site" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Site URL"
        text={
          "The address where your deck is deployed.\nA link to one deck works too - it is trimmed back to the site root."
        }
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://slides.example.dev"
        value={url}
        error={error}
        onChange={(value) => {
          setUrl(value);
          if (error) setError(undefined);
        }}
      />
      <Form.TextField
        id="label"
        title="Name"
        placeholder="Optional — defaults to the hostname"
        value={label}
        onChange={setLabel}
      />
    </Form>
  );
}
