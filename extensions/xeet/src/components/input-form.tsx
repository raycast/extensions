import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { detectInput, MAX_INPUT_BYTES } from "../lib/input";
import { getEngine, renderPost } from "../lib/renderer";
import { clearResolutionCache, resolveInput } from "../lib/resolver";
import { cacheDirectory, defaultOptions, lastOptions, saveOptions, settings } from "../lib/settings";
import AppearanceFields from "./appearance-fields";
import PostPreview from "./post-preview";
import VariantGrid from "./variant-grid";

export default function InputForm({ compare = false, quick = false }: { compare?: boolean; quick?: boolean }) {
  const [options, setOptions] = useState(defaultOptions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const edited = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const { push } = useNavigation();

  const { handleSubmit, itemProps, setValue, setValidationError, values } = useForm<{ input: string }>({
    initialValues: { input: "" },
    validation: {
      input: (value) => {
        try {
          detectInput(value ?? "");
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
    },
    onSubmit: async ({ input }) => {
      edited.current = true;
      await generate(input);
    },
  });
  const { isLoading: initializing } = usePromise(
    async () => ({
      options: await lastOptions(),
      text: quick || settings().autoClipboard ? await Clipboard.readText() : undefined,
    }),
    [],
    {
      onData: ({ options, text }) => {
        if (edited.current) return;
        setOptions(options);
        if (text?.trim() && Buffer.byteLength(text) <= MAX_INPUT_BYTES) {
          setValue("input", text);
          setValidationError("input", undefined);
          if (quick) void generate(text, options);
        } else if (quick) {
          setError("The clipboard has no supported text. Copy post text, an X URL, or Xeet Post JSON, then retry.");
        }
      },
      onError: (error) => setError(error.message),
    },
  );

  async function generate(text = values.input, renderOptions = options) {
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
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  async function readClipboard() {
    try {
      const text = await Clipboard.readText();
      edited.current = true;
      setValue("input", text || "");
      setValidationError("input", undefined);
      setError(undefined);
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Read Clipboard" });
    }
  }

  return (
    <Form
      isLoading={busy || initializing}
      actions={
        <ActionPanel>
          {busy ? (
            <Action title="Cancel Resolution" icon={Icon.XMarkCircle} onAction={() => controller.current?.abort()} />
          ) : (
            <Action.SubmitForm
              title={compare ? "Compare Layouts" : "Generate Preview"}
              icon={Icon.Image}
              onSubmit={handleSubmit}
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
        {...itemProps.input}
        title="Post"
        placeholder="https://x.com/handle/status/123, post text, or Xeet Post JSON"
        onChange={(value) => {
          edited.current = true;
          itemProps.input.onChange?.(value);
          setError(undefined);
        }}
      />
      {error && <Form.Description title="Could Not Generate Preview" text={error} />}
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
