import React, { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, useNavigation, Detail } from "@raycast/api";

interface CommandForm {
  htmlInput: string;
}

function convertHtmlToMarkdown(html: string): string {
  return html
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<a href="(.*?)">(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<ul>(.*?)<\/ul>/gis, "$1\n")
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n");
}

function PreviewHTML({ html }: { html: string }) {
  const markdown = convertHtmlToMarkdown(html);

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push title="View Source" target={<SourceCode html={html} />} />
        </ActionPanel>
      }
    />
  );
}

function SourceCode({ html }: { html: string }) {
  return (
    <Detail
      markdown={`\`\`\`html\n${html}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.Push title="View Preview" target={<PreviewHTML html={html} />} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [htmlInput, setHtmlInput] = useState("");

  function handleSubmit(values: CommandForm) {
    if (!values.htmlInput.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Empty Input",
        message: "Please enter some HTML code",
      });
      return;
    }

    let html = values.htmlInput;
    if (!/^\s*<(!DOCTYPE|html|body)/i.test(html)) {
      html = `
        <!DOCTYPE html>
        <html>
          <body>
            ${html}
          </body>
        </html>
      `;
    }

    push(<PreviewHTML html={html} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="htmlInput"
        title="HTML Input"
        placeholder="Enter your HTML code here"
        value={htmlInput}
        onChange={setHtmlInput}
      />
    </Form>
  );
}
