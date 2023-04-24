import { ActionPanel, Action, Form, showToast, Toast, closeMainWindow, showHUD, useNavigation } from "@raycast/api";
import { useState } from "react";
import { generateMeme } from "../api";
import { ImgflipCaptionImageBox } from "../api/types";
import copyFileToClipboard from "../lib/copyFileToClipboard";
import { Meme } from "../types";

interface FormValues {
  capitalize: string;
  [text: string]: string;
}

export default function MemeForm({ id, title, boxCount }: Meme) {
  const [textBoxError, setTextBoxError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  async function onSubmit(values: FormValues) {
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
          copyFileToClipboard(results.url, `${title}.jpg`).then((file) => {
            toast.hide();
            showHUD(`Meme "${file}" copied to clipboard`);
            closeMainWindow();
            pop();
          });
        })
        .catch((error) => {
          console.log(error);
          showToast(Toast.Style.Failure, "Something went wrong", error.message);
        })
        .finally(() => {
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
          <Action.SubmitForm onSubmit={onSubmit} />
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
