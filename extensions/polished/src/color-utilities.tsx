import { Form, SubmitFormAction, ActionPanel, showToast, ToastStyle, useNavigation } from "@raycast/api";
import {
  lighten,
  darken,
  transparentize,
  complement,
  grayscale,
  invert,
  readableColor,
  parseToHsl,
  hslToColorString,
} from "polished";
import { Results } from "./components";
import { isBetween } from "./utils";

type Values = {
  color: string;
  lightenInput: string;
  darkenInput: string;
  transparentizeInput: string;
};

export default function ColorUtilities() {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const { color, lightenInput, darkenInput, transparentizeInput } = values;
    const l = parseFloat(lightenInput);
    const d = parseFloat(darkenInput);
    const t = parseFloat(transparentizeInput);

    if (!color) {
      showToast(ToastStyle.Failure, "Color is required", "Please enter a value for Color at the top.");
      return;
    }

    if ((!isBetween(l, [0, 1]) && l) || (!isBetween(d, [0, 1]) && d) || (!isBetween(t, [0, 1]) && t)) {
      showToast(
        ToastStyle.Failure,
        "Input incorrect",
        "Please enter a value between 0 and 1 for Lighten, Darken, or Transparentize.",
      );
      return;
    }

    let lightenResult = undefined;
    let darkenResult = undefined;
    let transparentizeResult = undefined;
    let parsedColor = undefined;

    try {
      const tempColor = parseToHsl(color);
      parsedColor = hslToColorString(tempColor);
    } catch (error) {
      showToast(
        ToastStyle.Failure,
        "Couldn't parse the color string",
        "Please provide a valid HEX, RGB, RGBA, or CSS Color",
      );
      return;
    }

    try {
      if (l) {
        lightenResult = lighten(l, color);
      }
      if (d) {
        darkenResult = darken(d, color);
      }
      if (t) {
        transparentizeResult = transparentize(t, color);
      }
    } catch (error) {
      showToast(ToastStyle.Failure, "Modification failed", "Make sure you entered a valid HEX or RGB color.");
    }

    const inputText = `${color} ${
      lightenResult || darkenResult || transparentizeResult
        ? `(with: ${lightenResult ? `lighten` : ``}${darkenResult ? `darken` : ``}${
            transparentizeResult ? `, transparentize` : ``
          })`
        : ``
    }`;

    push(
      <Results
        input={inputText}
        original={parsedColor}
        lighten={lightenResult}
        darken={darkenResult}
        transparentize={transparentizeResult}
        complement={complement(color)}
        grayscale={grayscale(color)}
        invert={invert(color)}
        readableColor={readableColor(color)}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="color" placeholder="#000 or rgb(0, 0, 0) or black" title="Color" />
      <Form.Separator />
      <Form.TextField id="lightenInput" placeholder="0.5 (0 to 1)" title="Lighten" />
      <Form.TextField id="darkenInput" placeholder="0.5 (0 to 1)" title="Darken" />
      <Form.Separator />
      <Form.TextField id="transparentizeInput" placeholder="0.5 (0 to 1)" title="Transparentize" />
    </Form>
  );
}
