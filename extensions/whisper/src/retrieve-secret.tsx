import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  fetchSecretMetadata,
  StructuredRow,
  looksLikeWhisperLink,
  parseStructuredSecret,
  parseWhisperLink,
  RetrievedSecret,
  retrieveSecret,
} from "./shared";

interface FormValues {
  link: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Pre-fill from the clipboard when it already holds a Whisper link.
  useEffect(() => {
    Clipboard.readText()
      .then((text) => {
        if (looksLikeWhisperLink(text)) setLink(text?.trim() ?? "");
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(values: FormValues) {
    let parsed;
    try {
      parsed = parseWhisperLink(values.link);
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Invalid link");
      return;
    }
    setLinkError(undefined);

    setIsLoading(true);
    try {
      const meta = await fetchSecretMetadata(parsed);
      if (meta) {
        if (!meta.exists) {
          throw new Error("Link unavailable: this secret expired, was already viewed, or never existed.");
        }
        if (meta.clientEncrypted && !parsed.key) {
          // Refuse to burn a single-view secret we could never decrypt.
          throw new Error(
            "This secret is end-to-end encrypted but the link has no #k= key. Ask the sender for the full link.",
          );
        }
        if (meta.selfDestruct) {
          const confirmed = await confirmAlert({
            title: "Reveal this single-view secret?",
            message: "It self-destructs after the first view: once revealed here, the link stops working for everyone.",
            icon: Icon.Trash,
            primaryAction: { title: "Reveal", style: Alert.ActionStyle.Destructive },
          });
          if (!confirmed) return;
        }
      } else if (!parsed.key) {
        // Server predates /meta, so we cannot tell whether this secret is
        // end-to-end encrypted. Fetching would consume a single-view link and
        // only then discover we have no key, so refuse before the request.
        throw new Error(
          "This link has no #k= key and this server cannot confirm the secret's type. Fetching it could destroy the link without revealing anything \u2014 ask the sender for the full link.",
        );
      } else {
        // Server predates /meta: we cannot tell whether the link is single-view.
        const confirmed = await confirmAlert({
          title: "Reveal this secret?",
          message:
            "This server cannot say whether the link is single-view. If it is, revealing it here destroys it for everyone else.",
          icon: Icon.QuestionMark,
          primaryAction: { title: "Reveal", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Decrypting secret..." });
      const secret = await retrieveSecret(parsed);
      await showToast({ style: Toast.Style.Success, title: "Secret decrypted on this device" });
      push(<RevealedSecret secret={secret} />);
    } catch (error) {
      console.error("Failed to retrieve secret:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      await showToast({ style: Toast.Style.Failure, title: "Could not retrieve secret", message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Retrieve Secret" icon={Icon.LockUnlocked} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste a Whisper link. The secret is fetched and decrypted on this device; the key in the link never leaves it." />
      <Form.TextField
        id="link"
        title="Whisper Link"
        placeholder="https://whisper.quentinvedrenne.com/get_secret?shared_secret_id=…#k=…"
        value={link}
        error={linkError}
        onChange={(value) => {
          setLink(value);
          if (linkError) setLinkError(undefined);
        }}
      />
    </Form>
  );
}

function RevealedSecret({ secret }: { secret: RetrievedSecret }) {
  const rows = parseStructuredSecret(secret.plaintext);
  return rows ? <StructuredSecretList rows={rows} secret={secret} /> : <SingleSecretDetail secret={secret} />;
}

function destructionNote(secret: RetrievedSecret): string {
  return secret.selfDestruct
    ? "This link has now been destroyed. Copy what you need before closing."
    : "This link can still be opened until it expires.";
}

function SingleSecretDetail({ secret }: { secret: RetrievedSecret }) {
  const [revealed, setRevealed] = useState(false);
  const masked = "•".repeat(Math.min(secret.plaintext.length, 32));
  const body = revealed ? secret.plaintext : masked;
  const markdown = `## Your Secret\n\n\`\`\`\n${body.replace(/```/g, "` ` `")}\n\`\`\`\n\n_${destructionNote(secret)}_`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Encryption">
            <Detail.Metadata.TagList.Item
              text={secret.clientEncrypted ? "End-to-end (decrypted here)" : "Server-side (legacy)"}
              color={secret.clientEncrypted ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Self-destruct"
            text={secret.selfDestruct ? "Yes, link is now gone" : "No"}
            icon={secret.selfDestruct ? Icon.Trash : Icon.Repeat}
          />
          <Detail.Metadata.Label title="Size" text={`${secret.plaintext.length} characters`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Secret" icon={Icon.Clipboard} content={secret.plaintext} concealed />
          <Action
            title={revealed ? "Hide Secret" : "Show Secret"}
            icon={revealed ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "h" }, Windows: { modifiers: ["ctrl"], key: "h" } }}
            onAction={() => setRevealed((v) => !v)}
          />
          <Action.Paste
            title="Paste Secret"
            content={secret.plaintext}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "v" },
              Windows: { modifiers: ["ctrl", "shift"], key: "v" },
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function StructuredSecretList({ rows, secret }: { rows: StructuredRow[]; secret: RetrievedSecret }) {
  const [revealed, setRevealed] = useState(false);
  const toggleAction = (
    <Action
      title={revealed ? "Hide Values" : "Show Values"}
      icon={revealed ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "h" }, Windows: { modifiers: ["ctrl"], key: "h" } }}
      onAction={() => setRevealed((v) => !v)}
    />
  );
  const copyAllAction = (
    <Action.CopyToClipboard
      title="Copy All as JSON"
      icon={Icon.CodeBlock}
      content={secret.plaintext}
      concealed
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "c" },
        Windows: { modifiers: ["ctrl", "shift"], key: "c" },
      }}
    />
  );

  return (
    <List navigationTitle="Retrieved Secret" searchBarPlaceholder="Filter keys…">
      <List.Section title="Your Secrets" subtitle={destructionNote(secret)}>
        {rows.map((row) => (
          <List.Item
            key={row.id}
            title={row.label}
            subtitle={revealed ? row.value : "•".repeat(Math.min(row.value.length, 24))}
            icon={Icon.Key}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Value" icon={Icon.Clipboard} content={row.value} concealed />
                <Action.Paste title="Paste Value" content={row.value} />
                {toggleAction}
                {copyAllAction}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
