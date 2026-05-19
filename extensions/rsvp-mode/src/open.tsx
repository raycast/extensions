import { useState, useCallback } from "react";
import { LaunchProps } from "@raycast/api";
import { useRSVPArticle } from "./hooks/useRSVPArticle";
import { RSVPReaderView } from "./views/RSVPReaderView";
import { resolveUrl } from "./utils/url-resolver";

export default function Command(props: LaunchProps<{ arguments: Arguments.Open }>) {
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [invalidInput, setInvalidInput] = useState<string | null>(null);

  const resolveUrlCallback = useCallback(async () => {
    return resolveUrl(props.arguments.url);
  }, [props.arguments.url]);

  const handleNoUrl = useCallback(() => {
    if (props.arguments.url && props.arguments.url.trim()) {
      setInvalidInput(props.arguments.url.trim());
    }
    setShowUrlForm(true);
  }, [props.arguments.url]);

  const reader = useRSVPArticle({
    resolveUrl: resolveUrlCallback,
    onNoUrl: handleNoUrl,
    commandName: "open",
  });

  const handleUrlFormSubmit = useCallback(
    async (url: string) => {
      setShowUrlForm(false);
      setInvalidInput(null);
      await reader.handleUrlSubmit(url);
    },
    [reader],
  );

  return (
    <RSVPReaderView
      {...reader}
      showUrlForm={showUrlForm}
      invalidInput={invalidInput}
      onUrlFormSubmit={handleUrlFormSubmit}
      onHideUrlForm={() => setShowUrlForm(false)}
    />
  );
}
