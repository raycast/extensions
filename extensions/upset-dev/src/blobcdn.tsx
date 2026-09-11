import { Action, ActionPanel, Detail, Icon, Form, showHUD, useNavigation, Clipboard } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";

/** A type that represents all possible configuration of a "blob"
    see [Parameters](https://blobcdn.com)
*/
interface BlobConfigForm {
  seed: string;
  extraPoints: string;
  randomness: string;
  size: string;
  fill: string;
  stroke: string;
  strokeWidth: string;
}

/** A group of `useState` setters for setting the blob after the submission of `EditBlob` component  */
interface EditBlobProps {
  setSeed: React.Dispatch<React.SetStateAction<string>>;
  setExtraPoints: React.Dispatch<React.SetStateAction<string>>;
  setRandomness: React.Dispatch<React.SetStateAction<string>>;
  setSize: React.Dispatch<React.SetStateAction<string>>;
  setFill: React.Dispatch<React.SetStateAction<string>>;
  setStroke: React.Dispatch<React.SetStateAction<string>>;
  setStrokeWidth: React.Dispatch<React.SetStateAction<string>>;
}

// helper function to identify is `input` is a valid hex color code
function isHexColor(input: string | undefined): string {
  if (!input || input.length === 0) {
    return "";
  }

  const isHex = /^#?([A-F0-9]{6})$/i.test(input);
  return isHex ? "" : "input must be a hex color string!";
}

// less strict helper function to validate if `input` is an integer
function validateNumLoose(input: string | undefined): string {
  if (input == undefined || input.length == 0) {
    return "";
  }

  const parsed = Number(input);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    return "input must be an integer";
  }

  return "";
}

// helper function to validate if `input` is an integer
function validateNumStrict(input: string | undefined): string {
  if (input == undefined || input.length == 0) {
    return "input must not be empty";
  }

  const parsed = Number(input);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
    return "input must be an integer";
  }

  return "";
}

/** A wrapper `Form` component that takes `BlobConfigForm` from the user and sets its values to each corresponding props in `EditBlobProps`  */
function EditBlob({
  setSeed,
  setExtraPoints,
  setRandomness,
  setSize,
  setFill,
  setStroke,
  setStrokeWidth,
}: EditBlobProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<BlobConfigForm>({
    onSubmit: function (toBeSubmitted) {
      // after the user submits the form
      // `useState` setter for each configuration of a "blob" is set to their new values
      setSeed(toBeSubmitted.seed);
      setExtraPoints(toBeSubmitted.extraPoints);
      setRandomness(toBeSubmitted.randomness);
      setSize(toBeSubmitted.size);
      setFill(toBeSubmitted.fill);
      setStroke(toBeSubmitted.stroke);
      setStrokeWidth(toBeSubmitted.strokeWidth);
      // get back to `ShowBlob`
      pop();
    },
    initialValues: {
      seed: "",
      extraPoints: "4",
      randomness: "6",
      size: "256",
      fill: "",
      stroke: "",
      strokeWidth: "0",
    },
    validation: {
      seed: (val) => validateNumLoose(val),
      extraPoints: (val) => validateNumStrict(val),
      randomness: (val) => validateNumStrict(val),
      size: (val) => validateNumStrict(val),
      fill: (val) => isHexColor(val),
      stroke: (val) => isHexColor(val),
      strokeWidth: (val) => validateNumStrict(val),
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Blob Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Seed" {...itemProps.seed} />
      <Form.TextField title="Extra points" {...itemProps.extraPoints} />
      <Form.TextField title="Randomness" {...itemProps.randomness} />
      <Form.TextField title="Size" {...itemProps.size} />
      <Form.TextField title="Fill" {...itemProps.fill} />
      <Form.TextField title="Stroke" {...itemProps.stroke} />
      <Form.TextField title="Stroke width" {...itemProps.strokeWidth} />
    </Form>
  );
}

export default function ShowBlob() {
  const [seed, setSeed] = useState("");
  const [extraPoints, setExtraPoints] = useState("4");
  const [randomness, setRandomness] = useState("6");
  const [size, setSize] = useState("256");
  const [fill, setFill] = useState("");
  const [stroke, setStroke] = useState("");
  const [strokeWidth, setStrokeWidth] = useState("0");
  const url = `https://blobcdn.com/blob.svg?size=${size}&stroke=${stroke.substring(1)}&strokeWidth=${strokeWidth}&randomness=${randomness}&extraPoints=${extraPoints}${seed == "" ? "" : "&seed=" + seed}&fill=${fill.substring(1)}`;

  return (
    <Detail
      markdown={`
<img src="${url}" >
`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Seed" text={seed == "" ? "<random>" : seed} />
          <Detail.Metadata.Label title="Extra Points" text={extraPoints} />
          <Detail.Metadata.Label title="Randomness" text={randomness} />
          <Detail.Metadata.Label title="Size (px)" text={size} />
          <Detail.Metadata.Label title="fill" text={fill == "" ? "<random>" : fill} />
          <Detail.Metadata.Label title="stroke" text={stroke == "" ? "<random>" : stroke} />
          <Detail.Metadata.Label title="Stroke Width" text={strokeWidth} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy SVG Code"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              const response = await fetch(url);
              const svgText = await response.text();
              await Clipboard.copy(svgText);
              await showHUD("copied blob svg to clipboard!");
            }}
          />
          <Action.Push
            title="Edit Blob"
            icon={Icon.Pencil}
            target={
              <EditBlob
                setSeed={setSeed}
                setExtraPoints={setExtraPoints}
                setRandomness={setRandomness}
                setSize={setSize}
                setFill={setFill}
                setStroke={setStroke}
                setStrokeWidth={setStrokeWidth}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}
