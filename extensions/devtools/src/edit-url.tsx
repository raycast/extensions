import { Detail, LaunchProps, useNavigation } from "@raycast/api";
import { UrlEditor } from "./components/url-editor";
import { UrlInput } from "./components/url-input";
import { useInput } from "./hooks/use-input";
import { parseUrl } from "./lib/url";

export default function Command(props: LaunchProps<{ arguments: Arguments.EditUrl }>) {
  const { value, isLoading } = useInput(props.arguments.url || props.fallbackText, URL.canParse);
  const { push } = useNavigation();

  if (isLoading) return <Detail isLoading markdown="Reading URL…" />;
  if (URL.canParse(value)) return <UrlEditor initialUrl={parseUrl(value)} />;

  return <UrlInput initialValue={value} onSubmit={(input) => push(<UrlEditor initialUrl={parseUrl(input)} />)} />;
}
