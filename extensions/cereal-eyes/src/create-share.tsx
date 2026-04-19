import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createShare, getShareContactSuggestions } from "./utils/api";
import type { Contact, Snippet, SnippetSharePayload } from "./types";

type ShareType = "link" | "restricted" | "burner";

interface Props {
  snippet: Snippet;
  type: ShareType;
  onSuccess?: () => void;
}

const TYPE_TITLES: Record<ShareType, string> = {
  link: "Create Link Share",
  restricted: "Share with Contacts",
  burner: "Create Burner Link",
};

export default function CreateShare({ snippet, type, onSuccess }: Props) {
  const { pop } = useNavigation();

  const [accessMode, setAccessMode] = useState<string>("public_link");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [maxViews, setMaxViews] = useState("1");
  const [maxViewsError, setMaxViewsError] = useState<string | undefined>();
  const [recipientsError, setRecipientsError] = useState<string | undefined>();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (type === "restricted") {
      getShareContactSuggestions()
        .then((res) => {
          // Merge favorites + contacts + recent, deduped by email_normalized
          const seen = new Set<string>();
          const merged: Contact[] = [];
          for (const c of [
            ...res.data.favorites,
            ...res.data.contacts,
            ...res.data.recent,
          ]) {
            if (!seen.has(c.email_normalized)) {
              seen.add(c.email_normalized);
              merged.push(c);
            }
          }
          setContacts(merged);
        })
        .catch(() => {
          // contacts are optional — proceed without them
        });
    }
  }, [type]);

  function validate(): boolean {
    if (type === "burner") {
      const parsed = parseInt(maxViews, 10);
      if (isNaN(parsed) || parsed < 1) {
        setMaxViewsError("Must be a number greater than 0");
        return false;
      }
      setMaxViewsError(undefined);
    }

    if (type === "restricted") {
      const validRecipients = recipients.filter((recipient) =>
        recipient.includes("@"),
      );
      if (validRecipients.length === 0) {
        setRecipientsError("Add at least one valid email address");
        return false;
      }
      setRecipientsError(undefined);
    }

    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating share…",
    });

    try {
      const payload: SnippetSharePayload = { type };

      if (type === "link" || type === "restricted") {
        payload.access_mode = accessMode as "public_link" | "auth_required";
      }

      if (type === "burner") {
        payload.max_views = parseInt(maxViews, 10);
      }

      if (type === "restricted" && recipients.length > 0) {
        payload.recipient_emails = recipients.filter((r) => r.includes("@"));
      }

      if (expiresAt) {
        payload.expires_at = expiresAt.toISOString();
      }

      const result = await createShare(snippet.id, payload);
      const shareUrl = result.data.share_url;

      if (shareUrl) {
        await Clipboard.copy(shareUrl);
        toast.style = Toast.Style.Success;
        toast.title =
          type === "burner"
            ? "Burner link created & copied"
            : "Share link created & copied";
        toast.message = shareUrl;
      } else {
        toast.style = Toast.Style.Success;
        toast.title = "Share created";
      }

      onSuccess?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create share";
      toast.message = error instanceof Error ? error.message : undefined;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={TYPE_TITLES[type]}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action title={TYPE_TITLES[type]} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* Recipient picker — restricted only */}
      {type === "restricted" && (
        <Form.TagPicker
          id="recipients"
          title="Recipients"
          value={recipients}
          onChange={setRecipients}
          error={recipientsError}
          placeholder="Select or type email addresses…"
          info="Select from your contacts or type any email address"
        >
          {contacts.map((c) => (
            <Form.TagPicker.Item
              key={c.email_normalized}
              value={c.email}
              title={c.is_favorite ? `★ ${c.display_name}` : c.display_name}
            />
          ))}
        </Form.TagPicker>
      )}

      {/* Access mode — link and restricted only */}
      {(type === "link" || type === "restricted") && (
        <Form.Dropdown
          id="access_mode"
          title="Access"
          value={accessMode}
          onChange={setAccessMode}
        >
          <Form.Dropdown.Item
            value="public_link"
            title="Anyone with the link"
          />
          <Form.Dropdown.Item
            value="auth_required"
            title="Requires Cereal Eyes account"
          />
        </Form.Dropdown>
      )}

      {/* Max views — burner only */}
      {type === "burner" && (
        <Form.TextField
          id="max_views"
          title="Max Views"
          value={maxViews}
          onChange={setMaxViews}
          error={maxViewsError}
          onBlur={() => validate()}
          info="Link self-destructs after this many views"
        />
      )}

      <Form.DatePicker
        id="expires_at"
        title="Expires At"
        value={expiresAt}
        onChange={setExpiresAt}
        type={Form.DatePicker.Type.DateTime}
        info="Leave empty for no expiry"
      />

      <Form.Description title="Snippet" text={snippet.title ?? "Untitled"} />
    </Form>
  );
}
