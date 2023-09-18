import { showToast, Toast, getPreferenceValues, LaunchProps, Detail, ActionPanel, Action } from "@raycast/api";
import fetch from "node-fetch"; // v2.6.1
import { useEffect, useState } from "react";

interface Preferences {
  project: string;
}

export default function Command(props: LaunchProps) {
  showToast(Toast.Style.Animated, "Generating... (the first generation takes a bit longer)");
  const preferences = getPreferenceValues<Preferences>();
  const { project } = props.arguments;
  const [generatedText, setGeneratedText] = useState<string>("");
  const [selectedGenerator, setSelectedGenerator] = useState<string>(project === "" ? preferences.project : project);

  async function regenerateText(generatorName: string) {
    try {
      const response = await fetch(`https://cat-sequoia-parcel.glitch.me/api?generator=${generatorName}&list=output`);
      const html = await response.text();
      setGeneratedText(html);
      showToast(Toast.Style.Success, "Successfully Regenerated!");
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Something went wrong. Please try again.",
      });
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://cat-sequoia-parcel.glitch.me/api?generator=${selectedGenerator}&list=output`
        );
        const html = await response.text();
        setGeneratedText(html);
        showToast(Toast.Style.Success, "Successfully Generated!");
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Something went wrong. Please try again.",
        });
      }
    };

    fetchData();
  }, [selectedGenerator]);
  showToast(Toast.Style.Success, "Successfully Regenerated!");
  return (
    <Detail
      markdown={`# ${generatedText}`}
      navigationTitle={`Generating from ${project || preferences.project}`}
      actions={
        <ActionPanel>
          <Action title="Regenerate" onAction={() => regenerateText(selectedGenerator)} />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://perchance.org/${project || preferences.project}`}
          />
          <Action.CopyToClipboard title="Copy to Clipboard" content={generatedText} />
          <Action.Paste title="Paste" content={generatedText} />
        </ActionPanel>
      }
    />
  );
}
