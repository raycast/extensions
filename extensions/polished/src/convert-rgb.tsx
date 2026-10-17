import { ActionPanel, Form, SubmitFormAction, useNavigation, showToast, ToastStyle } from "@raycast/api";
import { rgba, parseToHsl } from "polished";
import { Results } from "./components";
import { isBetween } from "./utils";

type Values = {
  red: string;
  green: string;
  blue: string;
};

export default function ConvertRgb() {
  const { push } = useNavigation();

  function handleSubmit(values: Values): void {
    const { red, green, blue } = values;
    const r = parseInt(red);
    const g = parseInt(green);
    const b = parseInt(blue);

    if ((r && !isBetween(r, [0, 255])) || (g && !isBetween(g, [0, 255])) || (b && !isBetween(b, [0, 255]))) {
      showToast(ToastStyle.Failure, "Input incorrect", "Please enter a value between 0 and 255 for RGB.");
      return;
    }

    let hexResult;
    let hslResult;
    try {
      hexResult = rgba({ red: r, green: g, blue: b, alpha: 1 });

      const { hue: h, saturation: s, lightness: l } = parseToHsl(`rgb(${r},${g},${b})`);
      hslResult = `hsl(${parseFloat(h.toFixed(2))},${parseFloat(s.toFixed(2)) * 100}%,${
        parseFloat(l.toFixed(2)) * 100
      }%)`;
    } catch (error) {
      showToast(
        ToastStyle.Failure,
        "Couldn't parse the color string",
        "Please provide the color as valid RGB notation.",
      );
      return;
    }

    push(<Results input={`rgb(${r},${g},${b})`} hex={hexResult} hsl={hslResult} />);
  }

  return (
    <Form
      navigationTitle="Convert RGB to HEX & HSL"
      actions={
        <ActionPanel>
          <SubmitFormAction title="Convert" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="red" placeholder="255" title="Red" />
      <Form.TextField id="green" placeholder="255" title="Green" />
      <Form.TextField id="blue" placeholder="255" title="Blue" />
    </Form>
  );
}
