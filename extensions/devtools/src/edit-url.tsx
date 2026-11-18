import { Detail, LaunchProps, useNavigation } from "@raycast/api";
import { UrlEditor } from "./components/url-editor";
import { UrlInput } from "./components/url-input";
import { useInput } from "./hooks/use-input";
import { parseUrl } from "./lib/url";

function isUrl(text: string): boolean {
  try {
    parseUrl(text);
    return true;
  } catch {
    return false;
  }
}

export default function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const { value, isLoading } = useInput(props.arguments.url || props.fallbackText, isUrl);
  const { push } = useNavigation();

  if (isLoading) return <Detail isLoading markdown="Reading URL…" />;
  if (isUrl(value)) return <UrlEditor initialUrl={parseUrl(value)} />;

  return (
    <UrlInput
      title="Enter URL"
      initialValue={value}
      onSubmit={(input) => push(<UrlEditor initialUrl={parseUrl(input)} />)}
    />
  );
}
