import { Action, ActionPanel, Detail, Form, LaunchProps, getPreferenceValues, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { DisplayView } from "./lib/display-view";
import { tryNormalizeUrl } from "./lib/url";
import { resolveUrlFromArgOrClipboard } from "./lib/url-source";
import type { CommandArguments, CommandPreferences } from "./lib/types";

type State = { kind: "resolving" } | { kind: "form" } | { kind: "ready"; url: string };

export default function DisplayUrl(props: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [state, setState] = useState<State>({ kind: "resolving" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveUrlFromArgOrClipboard(props.arguments.url);
      if (cancelled) return;
      setState(resolved ? { kind: "ready", url: resolved } : { kind: "form" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "resolving") {
    return <Detail isLoading markdown="# Looking for a URL…" />;
  }

  if (state.kind === "form") {
    return <UrlForm preferences={preferences} />;
  }

  return <DisplayView url={state.url} preferences={preferences} />;
}

function UrlForm(props: { preferences: CommandPreferences }) {
  const { push } = useNavigation();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Convert"
            onSubmit={() => {
              const normalized = tryNormalizeUrl(url);
              if (normalized) {
                // Pushed rather than swapped in place, so ⎋ returns to the form
                // with the typed URL intact instead of closing the command.
                push(<DisplayView url={normalized} preferences={props.preferences} />);
              } else {
                setError("Enter a http(s) URL, e.g. example.com/blog-post");
              }
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
        error={error}
        onChange={(value) => {
          setUrl(value);
          if (error) setError(undefined);
        }}
      />
    </Form>
  );
}
