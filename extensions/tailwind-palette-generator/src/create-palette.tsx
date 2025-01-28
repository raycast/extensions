import { Form, ActionPanel, Action, showToast, Icon, useNavigation, Detail } from "@raycast/api";
import got from "got";
import colorNamer from "color-namer";
import { useForm } from "@raycast/utils";

type Values = {
  color: string;
};

function expandHexColor(hex: string): string {
  if (hex[0] !== "#") {
    hex = `#${hex}`;
  }

  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  } else if (hex.length === 7) {
    return hex;
  } else {
    throw new Error("Invalid hex color length. Expected 3 or 6 digits after #.");
  }
}

function nameThatColor(color: string) {
  const nameVariants = colorNamer(color);

  if (!nameVariants.pantone.length) {
    return nameVariants.basic[0].name;
  }

  return nameVariants.pantone[0].name.toLowerCase();
}

function trimBraces(str: string): string {
  return str.replace(/^{|}$/g, "").trim();
}

function ShowPalette({ json }: { json: string }) {
  const formattedJson = trimBraces(JSON.stringify(JSON.parse(json), null, 2));

  const markdown = `
  Paste this into your \`tailwind.config.js\` file
  \`\`\`json
  ${formattedJson}
  \`\`\`
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={formattedJson} />
        </ActionPanel>
      }
    />
  );
}

const validateColor = (value: string | undefined) => {
  if (!value) {
    return "What are we supposed to do without a color?";
  }

  if (!/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
    return "Please provide a HEX color, e.g. #RGB, #RRGGBB, RGB, RRGGBB";
  }

  return;
};

export default function Command() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit(values) {
      const colorHex = expandHexColor(values.color);
      const colorName = nameThatColor(colorHex).replace(/\s+/g, "-");
      const tempColorName = "tempname";

      // Apparently the API doesn't support neither dashes nor spaces, so we hack it with a temporary name
      const { body } = await got.get(`https://www.tints.dev/api/${tempColorName}/${colorHex.replace("#", "")}`);

      const json = body.replaceAll(tempColorName, colorName);

      push(<ShowPalette json={json} />);

      void showToast({ title: "Color palette created!", message: `${colorName} is a really good taste!` });
    },
    validation: {
      color: validateColor,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Pencil} title="Generate a Palette" />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a color HEX code to create a palette" />

      <Form.TextField autoFocus title="HEX color value" placeholder="#000" {...itemProps.color} />
    </Form>
  );
}
