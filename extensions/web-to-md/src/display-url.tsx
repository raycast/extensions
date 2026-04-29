import {
  Action,
  ActionPanel,
  Detail,
  Form,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { DisplayView } from "./lib/display-view";
import { looksLikeUrl, normalizeUrl } from "./lib/url";
import { resolveUrlFromArgOrClipboard } from "./lib/url-source";
import type { CommandArguments, CommandPreferences } from "./lib/types";

type State =
  | { kind: "resolving" }
  | { kind: "form"; initialUrl: string }
  | { kind: "ready"; url: string };

export default function DisplayUrl(
  props: LaunchProps<{ arguments: CommandArguments }>,
) {
  const preferences = getPreferenceValues<CommandPreferences>();
  const [state, setState] = useState<State>({ kind: "resolving" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveUrlFromArgOrClipboard(props.arguments.url);
      if (cancelled) return;
      if (resolved) {
        setState({ kind: "ready", url: resolved });
      } else {
        setState({ kind: "form", initialUrl: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "resolving") {
    return <Detail isLoading markdown="# Looking for a URL…" />;
  }

  if (state.kind === "form") {
    return (
      <UrlForm
        initialUrl={state.initialUrl}
        onSubmit={(url) => setState({ kind: "ready", url: normalizeUrl(url) })}
      />
    );
  }

  return <DisplayView url={state.url} preferences={preferences} />;
}

function UrlForm(props: {
  initialUrl: string;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState(props.initialUrl);
  const valid = looksLikeUrl(url);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert"
            onSubmit={() => {
              if (valid) props.onSubmit(url);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/blog-post"
        value={url}
        onChange={setUrl}
      />
    </Form>
  );
}
