import { ActionPanel, Action, Form, showToast, Toast, useNavigation, showHUD, Icon } from "@raycast/api";
import { useState } from "react";
import { generateMeme } from "../api";
import { ImgflipCaptionImageBox } from "../api/types";
import { Meme } from "../types";
import MemePreview from "./MemePreview";
import copyFileToClipboard from "../lib/copyFileToClipboard";

interface FormValues {
  capitalize: string;
  [text: string]: string;
}

export default function MemeForm({ id, title, boxCount }: Meme) {
  const [textBoxError, setTextBoxError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function onSubmit(values: FormValues, preview: boolean) {
    const boxes = boxesFromFormValues(values);

    if (!boxes.some((box) => !!box.text)) {
      setTextBoxError("At least one text input has to be filled");
      return;
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Generating...",
    }).then((toast) => {
      setIsLoading(true);

      generateMeme({ id, boxes })
        .then(async (results) => {
          if (preview) {
            push(<MemePreview title={title} url={results.url} />);
          } else {
            await copyFileToClipboard(results.url, `${title}.jpg`);
            showHUD(`Meme "${title}" copied to clipboard`);
          }
        })
        .catch((error) => {
          console.log(error);
          showToast(Toast.Style.Failure, "Something went wrong", error.message);
        })
        .finally(() => {
          toast.hide();
          setIsLoading(false);
        });
    });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Generate meme "${title}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Clipboard}
            onSubmit={(values: FormValues) => onSubmit(values, false)}
            title="Copy to clipboard"
          />
          <Action.SubmitForm
            icon={Icon.Eye}
            onSubmit={(values: FormValues) => onSubmit(values, true)}
            title="Preview"
          />
        </ActionPanel>
      }
    >
      {[...Array(boxCount).keys()].map((index) => (
        <Form.TextField
          key={`text_${index}`}
          id={`text[${index}]`}
          title={`Text #${index + 1}`}
          error={textBoxError}
          onChange={() => setTextBoxError(undefined)}
        />
      ))}

      <Form.Checkbox id="capitalize" title="Capitalize text" label="" defaultValue={true} />
    </Form>
  );
}

function boxesFromFormValues(values: FormValues): ImgflipCaptionImageBox[] {
  const { capitalize } = values;

  return Object.keys(values).reduce<ImgflipCaptionImageBox[]>((boxes, id) => {
    const matches = id.match(/text\[(.)\]/);
    if (!matches) return boxes;
    boxes[parseInt(matches[1])] = {
      text: capitalize ? values[id].toUpperCase() : values[id],
    };
    return boxes;
  }, []);
}
