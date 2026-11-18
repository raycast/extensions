import { Detail, LaunchProps, useNavigation } from "@raycast/api";
import { QrCodePreview } from "./components/qr-preview";
import { UrlInput } from "./components/url-input";
import { useInput } from "./hooks/use-input";
export default function Command(props: LaunchProps<{ arguments: Arguments.UrlToQr }>) {
  const { value, isLoading } = useInput(props.arguments.url || props.fallbackText, URL.canParse);
  const { push } = useNavigation();
  if (isLoading) return <Detail isLoading markdown="Reading URL…" />;
  if (URL.canParse(value)) return <QrCodePreview url={value.trim()} />;
  return (
    <UrlInput
      initialValue={value}
      onSubmit={(input) => push(<QrCodePreview url={input} navigationTitle="URL QR Code" />)}
    />
  );
}
