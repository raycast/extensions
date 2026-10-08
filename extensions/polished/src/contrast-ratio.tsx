import { Form, ActionPanel, useNavigation, Detail, SubmitFormAction, showToast, ToastStyle } from "@raycast/api";
import { getContrast } from "polished";

type Values = {
  text: string;
  background: string;
};

export default function ContrastRatio() {
  const { push } = useNavigation();

  function handleSubmit(values: Values) {
    const { text, background } = values;
    let contrast;

    try {
      contrast = getContrast(text, background);
    } catch (error) {
      showToast(
        ToastStyle.Failure,
        "Couldn't parse the color string",
        "Please provide the colors in a valid input format.",
      );
      return;
    }

    push(<Result text={text} background={background} contrast={contrast} />);
  }

  return (
    <Form
      navigationTitle="Contrast Ratio"
      actions={
        <ActionPanel>
          <SubmitFormAction title="Calculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" placeholder="#000" title="Text Color" />
      <Form.TextField id="background" placeholder="#fff" title="Background Color" />
    </Form>
  );
}

type Result = {
  contrast: number;
  text: string;
  background: string;
};

function Result({ contrast, text, background }: Result) {
  const ratios = {
    AA: contrast >= 4.5,
    AALarge: contrast >= 3,
    AAA: contrast >= 7,
    AAALarge: contrast >= 4.5,
  };

  const markdown = `
## Result

Your text color is **${text}** and your background color is **${background}**.

The contrast ratio between both colors is: **${contrast}**

Results for each ratio:

- ${ratios.AA ? `Passes AA. Required ratio: 4.5` : `Fails AA. Required ratio: 4.5`}
- ${ratios.AALarge ? `Passes AALarge. Required ratio: 3` : `Fails AALarge. Required ratio: 3`}
- ${ratios.AAA ? `Passes AAA. Required ratio: 7` : `Fails AAA. Required ratio: 7`}
- ${ratios.AAALarge ? `Passes AAALarge. Required ratio: 4.5` : `Fails AALarge. Required ratio: 4.5`}

Based on the [contrast calculations recommended by W3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html). **Large** means that the text is 18pt or larger.

---

Contrast is the difference in luminance or color that makes an object (or its representation in an image or display) distinguishable. In visual perception of the real world, contrast is determined by the difference in the color and brightness of the object and other objects within the same field of view.
  `;

  return <Detail markdown={markdown} />;
}
