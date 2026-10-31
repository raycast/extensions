import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getFrontmostApplication,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { bundleID, Snippet, snippetPlaces, snippets } from "./data";

/** `{{clipboard}}` and `{{date}}` are filled here; `{{cursor}}` goes; the rest the form asks for. */
async function fill(body: string, given: Record<string, string>): Promise<string> {
  const clip = /\{\{\s*clipboard\s*\}\}/.test(body) ? ((await Clipboard.readText()) ?? "") : "";
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, name: string) => {
    if (name === "clipboard") return clip;
    if (name === "date") return new Date().toLocaleDateString(undefined, { dateStyle: "long" });
    if (name === "cursor") return "";
    return given[name] ?? "";
  });
}

function PlacesForm({ snippet }: { snippet: Snippet }) {
  const places = snippetPlaces(snippet.body);
  return (
    <Form
      navigationTitle={snippet.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Paste"
            onSubmit={async (values: Record<string, string>) => {
              await Clipboard.paste(await fill(snippet.body, values));
              await closeMainWindow();
            }}
          />
        </ActionPanel>
      }
    >
      {places.map((p, i) => (
        <Form.TextField key={p} id={p} title={p} autoFocus={i === 0} />
      ))}
    </Form>
  );
}

export default function Command() {
  const all = useMemo(() => snippets(), []);
  const { data: front } = usePromise(() => getFrontmostApplication().catch(() => undefined));
  const { push } = useNavigation();
  const inYab = front?.bundleId === bundleID();
  const shown = all.filter((s) => inYab || !s.mailOnly);
  return (
    <List isShowingDetail={shown.length > 0} searchBarPlaceholder="Search snippets…">
      <List.EmptyView
        icon={Icon.Text}
        title="No snippets yet"
        description="Make them in Yab's Settings › Snippets, or type ; in a field."
      />
      {shown.map((s) => {
        const places = snippetPlaces(s.body);
        return (
          <List.Item
            key={s.id}
            icon={Icon.Text}
            title={s.name}
            keywords={[s.body.slice(0, 200), s.subject ?? ""]}
            accessories={s.mailOnly ? [{ tag: "Mail" }] : []}
            detail={<List.Item.Detail markdown={s.body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, "`$1`")} />}
            actions={
              <ActionPanel>
                {places.length ? (
                  <Action
                    title={`Paste in ${front?.name ?? "App"}…`}
                    icon={Icon.Clipboard}
                    onAction={() => push(<PlacesForm snippet={s} />)}
                  />
                ) : (
                  <Action
                    title={`Paste in ${front?.name ?? "App"}`}
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.paste(await fill(s.body, {}));
                      await closeMainWindow();
                    }}
                  />
                )}
                <Action
                  title="Copy"
                  icon={Icon.CopyClipboard}
                  onAction={async () => Clipboard.copy(await fill(s.body, {}))}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
