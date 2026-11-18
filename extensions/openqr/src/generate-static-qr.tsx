import { useState } from "react";
import { writeFileSync } from "node:fs";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { client, errorMessage, qrTempPath, safeName } from "./openqr";

interface FormValues {
  data: string;
  format: "png" | "svg";
  size: string;
  dark: string;
  light: string;
}

interface Result {
  data: string;
  format: "png" | "svg";
  /** Absolute path of the rendered file written to a temp dir. */
  path: string;
  /** Raw SVG markup, only when format === "svg". */
  svg?: string;
}

export default function Command() {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.data.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Text or URL is required",
      });
      return;
    }
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating QR code…",
    });
    try {
      const qr = client();
      const size = Math.min(2048, Math.max(64, Number(values.size) || 512));
      const opts = {
        data: values.data.trim(),
        size,
        dark: values.dark.trim() || undefined,
        light: values.light.trim() || undefined,
      };
      // Key the filename on every option, not just the payload stem: "a b" and "a-b" normalise
      // to the same stem, and the same text at a different size or colour is a different image.
      // Sharing one path would show a QR encoding the other result.
      const name = safeName(values.data);
      let path: string;
      let svg: string | undefined;
      if (values.format === "svg") {
        svg = await qr.generate({ ...opts, format: "svg" });
        path = qrTempPath(name, "svg", opts);
        writeFileSync(path, svg, "utf8");
      } else {
        const bytes = await qr.generate({ ...opts, format: "png" });
        path = qrTempPath(name, "png", opts);
        writeFileSync(path, bytes);
      }
      setResult({ data: values.data.trim(), format: values.format, path, svg });
      toast.style = Toast.Style.Success;
      toast.title = "QR code generated";
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate";
      toast.message = errorMessage(e);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const markdown =
      result.format === "png"
        ? `# QR Code\n\n\`${result.data}\`\n\n![QR code](file://${result.path}?raycast-width=240&raycast-height=240)`
        : `# QR Code (SVG)\n\n\`${result.data}\`\n\nSaved to \`${result.path}\`.`;
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.Open title="Open File" target={result.path} />
            <Action.ShowInFinder path={result.path} />
            <Action
              title="Copy File to Clipboard"
              icon={Icon.Clipboard}
              onAction={async () => {
                await Clipboard.copy({ file: result.path });
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied to clipboard",
                });
              }}
            />
            {result.svg ? (
              <Action.CopyToClipboard
                title="Copy SVG Markup"
                content={result.svg}
                icon={Icon.Code}
              />
            ) : null}
            <Action
              title="Generate Another"
              icon={Icon.ArrowClockwise}
              onAction={() => setResult(null)}
            />
            <Action
              title="Open Dashboard"
              icon={Icon.Globe}
              onAction={() => open("https://openqr.uk/dashboard")}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate"
            icon={Icon.BarCode}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="data"
        title="Text or URL"
        placeholder="https://openqr.uk"
        autoFocus
      />
      <Form.Dropdown id="format" title="Format" defaultValue="png">
        <Form.Dropdown.Item value="png" title="PNG" />
        <Form.Dropdown.Item value="svg" title="SVG" />
      </Form.Dropdown>
      <Form.TextField
        id="size"
        title="Size (px)"
        placeholder="512"
        defaultValue="512"
      />
      <Form.TextField
        id="dark"
        title="Foreground color"
        placeholder="232E3A (hex, optional)"
      />
      <Form.TextField
        id="light"
        title="Background color"
        placeholder="FFFFFF (hex, optional)"
      />
    </Form>
  );
}
