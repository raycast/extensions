import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { detectInput, MAX_INPUT_BYTES } from "../lib/input";
import { getEngine, renderPost } from "../lib/renderer";
import { clearResolutionCache, resolveInput } from "../lib/resolver";
import { cacheDirectory, defaultOptions, lastOptions, saveOptions, settings } from "../lib/settings";
import AppearanceFields from "./appearance-fields";
import PostPreview from "./post-preview";
import VariantGrid from "./variant-grid";

export default function InputForm({ compare = false, quick = false }: { compare?: boolean; quick?: boolean }) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState(defaultOptions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const edited = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  async function generate(text = input, renderOptions = options) {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError(undefined);
    try {
      detectInput(text);
      const result = await resolveInput(getEngine(), text, renderOptions, cacheDirectory(), abort.signal);
      abort.signal.throwIfAborted();
      if (compare) {
        if (active.current)
          push(
            <VariantGrid
              post={result.post}
              options={renderOptions}
              warnings={result.warnings}
              source={result.source}
            />,
          );
      } else {
        const preview = await renderPost(result.post, renderOptions, result.warnings, result.source);
        if (active.current && !abort.signal.aborted) push(<PostPreview preview={preview} />);
      }
      await saveOptions(renderOptions);
    } catch (error) {
      if (active.current && !abort.signal.aborted) {
        const message = error instanceof Error ? error.message : String(error);
        setError(message);
        await showFailureToast(error, { title: "Could Not Render Post" });
      }
    } finally {
      controller.current = null;
      if (active.current) setBusy(false);
    }
  }

  useEffect(() => {
    active.current = true;
    void (async () => {
      try {
        const saved = await lastOptions();
        if (active.current && !edited.current) setOptions(saved);
        if (quick || settings().autoClipboard) {
          const text = await Clipboard.readText();
          if (!active.current || edited.current) return;
          if (text?.trim() && Buffer.byteLength(text) <= MAX_INPUT_BYTES) {
            setInput(text);
            if (quick) await generate(text, saved);
          } else if (quick)
            setError("The clipboard has no supported text. Copy post text, an X URL, or Xeet Post JSON, then retry.");
        }
      } catch (error) {
        if (active.current) setError(error instanceof Error ? error.message : "Could not read the clipboard.");
      }
    })();
    return () => {
      active.current = false;
      controller.current?.abort();
    };
    // Initialization runs once: subsequent edits must never trigger clipboard reads.
  }, []);

  async function readClipboard() {
    try {
      const text = await Clipboard.readText();
      edited.current = true;
      setInput(text || "");
      setError(undefined);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Read Clipboard" });
    }
  }

  return (
    <Form
      navigationTitle={compare ? "Compare Post Layouts" : quick ? "Quick Render Clipboard" : "Render X Post"}
      isLoading={busy}
      actions={
        <ActionPanel>
          {busy ? (
            <Action title="Cancel Resolution" icon={Icon.XMarkCircle} onAction={() => controller.current?.abort()} />
          ) : (
            <Action.SubmitForm
              title={compare ? "Compare Layouts" : "Generate Preview"}
              icon={Icon.Image}
              onSubmit={() => generate()}
            />
          )}
          <Action title="Read Clipboard" icon={Icon.Clipboard} onAction={readClipboard} />
          <Action
            title="Clear Cached Posts"
            icon={Icon.Trash}
            onAction={async () => {
              try {
                await clearResolutionCache(cacheDirectory());
                await showToast({ style: Toast.Style.Success, title: "Cached Posts Cleared" });
              } catch (error) {
                await showFailureToast(error, { title: "Could Not Clear Cache" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Post"
        placeholder="https://x.com/handle/status/123, post text, or Xeet Post JSON"
        value={input}
        onChange={(value) => {
          edited.current = true;
          setInput(value);
          setError(undefined);
        }}
        error={error}
      />
      <Form.Description text="Text and JSON render locally. Public X URLs fetch from X and its media hosts only; unavailable posts show an error. No account or cookies required." />
      <Form.Separator />
      <AppearanceFields
        options={options}
        onChange={(options) => {
          edited.current = true;
          setOptions(options);
        }}
      />
    </Form>
  );
}
