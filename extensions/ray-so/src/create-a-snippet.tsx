import {
  Form,
  ActionPanel,
  closeMainWindow,
  open,
  showToast,
  Action,
  Toast,
  Color,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { createRaySoUrl } from "./utils";

interface Values {
  title: string;
  background: string;
  darkMode: string;
  padding: string;
  language: string;
  snippet: string;
  color: string;
}
interface Data {
  languages: { id: string; name: string }[];
  themes: {
    id: string;
    name: string;
    background: { from: string; to: string };
    iconUrl?: string;
    partner?: boolean;
  }[];
  padding: number[];
}
export default function CreateSnippet() {
  const preferences = getPreferenceValues<Preferences>();
  const { data } = useFetch<Data>("https://ray.so/api/config");

  const handleSubmit = async (values: Values) => {
    if (!values.snippet) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Code",
        message: "Code cannot be empty",
      });
      return;
    }

    const url = createRaySoUrl({
      theme: values.color,
      background: values.background === "true",
      darkMode: values.darkMode === "true",
      padding: values.padding,
      title: values.title || "Untitled 1",
      code: values.snippet,
      language: values.language,
    });

    await open(url);
    closeMainWindow();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Snippet" onSubmit={handleSubmit} />
          <Action title="Configure Default Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Untitled 1" />
      <Form.TextArea id="snippet" title="Code" placeholder="Paste your code here" />
      <Form.Separator />
      <Form.Dropdown id="color" title="Theme" defaultValue={preferences.theme} isLoading={!data}>
        {!data?.themes.some((theme) => theme.id === preferences.theme) && (
          <Form.Dropdown.Item value={preferences.theme} title="Default Theme" />
        )}
        <Form.Dropdown.Section title="Partners">
          {data?.themes.map(
            (theme) =>
              theme.partner && (
                <Form.Dropdown.Item
                  key={theme.id}
                  icon={{
                    source: `${theme.iconUrl}`,
                    tintColor: ["vercel", "rabbit"].includes(theme.id) ? Color.PrimaryText : undefined,
                    fallback: getGradientIconDataURL(theme.background),
                  }}
                  value={theme.id}
                  title={theme.name}
                />
              ),
          )}
        </Form.Dropdown.Section>
        {data?.themes.map(
          (theme) =>
            !theme.partner && (
              <Form.Dropdown.Item
                key={theme.id}
                icon={{ source: getGradientIconDataURL(theme.background) }}
                value={theme.id}
                title={theme.name}
              />
            ),
        )}
      </Form.Dropdown>
      <Form.Dropdown id="language" title="Language" storeValue defaultValue="auto" isLoading={!data}>
        <Form.Dropdown.Item value="auto" title="Auto-Detect" />
        {data?.languages.map((el: { id: string; name: string }, idx: number) => (
          <Form.Dropdown.Item key={idx} value={el.id} title={el.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="background" title="Background" defaultValue={String(preferences.background)}>
        <Form.Dropdown.Item value="true" title="Yes" />
        <Form.Dropdown.Item value="false" title="No" />
      </Form.Dropdown>
      <Form.Dropdown id="darkMode" title="Dark Mode" defaultValue={String(preferences.darkMode)}>
        <Form.Dropdown.Item value="true" title="Yes" />
        <Form.Dropdown.Item value="false" title="No" />
      </Form.Dropdown>
      <Form.Dropdown id="padding" title="Padding" defaultValue={preferences.padding}>
        {(data?.padding ?? [16, 32, 64, 128]).map((el: number, idx: number) => (
          <Form.Dropdown.Item key={idx} value={el.toString()} title={el.toString()} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function getGradientIconDataURL({ from, to }: Data["themes"][0]["background"]) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 24 24" >
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${from};" />
      <stop offset="100%" style="stop-color:${to};" />
    </linearGradient>
  </defs>
  <circle cx="12" cy="12" r="12" fill="url(#gradient)" />
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
