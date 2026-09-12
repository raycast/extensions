import { Detail, Toast, environment, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { execScript } from "../../lib/scripts";
import path from "path";

export default function SpeechInputView(props: {
  prompt: string;
  setSpeechInput: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
  const { prompt, setSpeechInput } = props;
  const [currentInput, setCurrentInput] = useState<string>("");

  useEffect(() => {
    const startSpeechInput = async () => {
      const toast = await showToast({ title: "Listening...", style: Toast.Style.Animated });
      const scriptPath = path.resolve(environment.assetsPath, "scripts", "SpeechInput.scpt");

      Promise.race([
        execScript(scriptPath, [], "JavaScript", (output) => {
          setCurrentInput((current: string) => current + output);
        }).data,
        new Promise((resolve) => setTimeout(resolve, 600000)),
      ]).then((final) => {
        if (typeof final == "string") {
          toast.title = "Done";
          toast.message = "Speech Input Complete";
          toast.style = Toast.Style.Success;
          setSpeechInput(final);
        } else {
          toast.title = "Error";
          toast.message = "Speech Input Failed";
          toast.style = Toast.Style.Failure;
          setSpeechInput(currentInput);
        }
      });
    };

    Promise.resolve(startSpeechInput()).then(() => console.log("Finished speech input"));
  }, []);

  return <Detail markdown={`_Prompt: ${prompt}_\n\nYour input: ${currentInput}`} />;
}
