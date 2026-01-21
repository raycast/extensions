import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon, getPreferenceValues } from "@raycast/api";
import { sendEmail } from "./smtp-client";
import { marked } from "marked";
import { Preferences } from "./types";

// Convert HTML to plain text with better formatting
function htmlToPlainText(html: string): string {
  let text = html;

  // Remove style, script, and head tags with their content
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  // Remove XML/VML behavior declarations
  text = text.replace(/v\\:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/o\\:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/w\\:\*\s*\{[^}]*\}/gi, "");
  text = text.replace(/\.shape\s*\{[^}]*\}/gi, "");

  // Convert common HTML entities
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#(\d+);/gi, (_, num) => String.fromCharCode(parseInt(num, 10)));

  // Convert line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/li>/gi, "\n");
  text = text.replace(/<\/tr>/gi, "\n");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, " "); // Multiple spaces/tabs to single space
  text = text.replace(/\n[ \t]+/g, "\n"); // Remove leading whitespace on lines
  text = text.replace(/[ \t]+\n/g, "\n"); // Remove trailing whitespace on lines
  text = text.replace(/\n{3,}/g, "\n\n"); // Max 2 consecutive newlines

  return text.trim();
}

export type ComposeMode = "reply" | "replyAll" | "forward" | "new";

interface ComposeFormProps {
  mode: ComposeMode;
  originalEmail?: {
    subject: string;
    from: string;
    to: string[];
    cc: string[];
    date: Date;
    body: string;
  };
}

export function ComposeForm({ mode, originalEmail }: ComposeFormProps) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const useMarkdown = prefs.composeFormat === "markdown";

  // Build initial values based on mode
  const getInitialTo = (): string => {
    if (!originalEmail) return "";
    switch (mode) {
      case "reply":
        return originalEmail.from;
      case "replyAll":
        return [originalEmail.from, ...originalEmail.to].filter(Boolean).join(", ");
      case "forward":
        return "";
      default:
        return "";
    }
  };

  const getInitialCc = (): string => {
    if (!originalEmail) return "";
    switch (mode) {
      case "replyAll":
        return originalEmail.cc.join(", ");
      default:
        return "";
    }
  };

  const getInitialSubject = (): string => {
    if (!originalEmail) return "";
    const subject = originalEmail.subject;
    switch (mode) {
      case "reply":
      case "replyAll":
        return subject.startsWith("Re:") ? subject : `Re: ${subject}`;
      case "forward":
        return subject.startsWith("Fwd:") ? subject : `Fwd: ${subject}`;
      default:
        return "";
    }
  };

  const getQuotedBody = (): string => {
    if (!originalEmail) return "";
    const dateStr = originalEmail.date.toLocaleString();
    // Clean up HTML if present in the body
    const cleanBody = htmlToPlainText(originalEmail.body);
    // Add > prefix to each line for proper email quoting
    const quotedLines = cleanBody
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const header = `\n\nOn ${dateStr}, ${originalEmail.from} wrote:\n`;
    return header + quotedLines;
  };

  const [to, setTo] = useState(getInitialTo());
  const [cc, setCc] = useState(getInitialCc());
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(getInitialSubject());
  const [body, setBody] = useState(getQuotedBody());
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!to.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a recipient" });
      return;
    }

    if (!subject.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a subject" });
      return;
    }

    setIsSending(true);
    try {
      // Convert markdown to HTML if markdown mode is enabled
      const htmlBody = useMarkdown ? await marked(body) : undefined;

      await sendEmail({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject,
        text: body,
        html: htmlBody,
      });

      showToast({ style: Toast.Style.Success, title: "Email sent successfully" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to send email", message: String(error) });
    } finally {
      setIsSending(false);
    }
  };

  const getModeTitle = (): string => {
    switch (mode) {
      case "reply":
        return "Reply";
      case "replyAll":
        return "Reply All";
      case "forward":
        return "Forward";
      case "new":
        return "New Email";
    }
  };

  return (
    <Form
      isLoading={isSending}
      navigationTitle={getModeTitle()}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Email" icon={Icon.Envelope} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField id="to" title="To" placeholder="recipient@example.com" value={to} onChange={setTo} />
      <Form.TextField id="cc" title="CC" placeholder="cc@example.com" value={cc} onChange={setCc} />
      <Form.TextField id="bcc" title="BCC" placeholder="bcc@example.com" value={bcc} onChange={setBcc} />
      <Form.TextField id="subject" title="Subject" placeholder="Email subject" value={subject} onChange={setSubject} />
      <Form.Separator />
      <Form.TextArea
        id="body"
        title="Message"
        placeholder={useMarkdown ? "Write your message here... (Markdown supported)" : "Write your message here..."}
        value={body}
        onChange={setBody}
        enableMarkdown={useMarkdown}
      />
    </Form>
  );
}
