import { ActionPanel, Detail, useNavigation } from "@raycast/api";
import escapeMd from "./markdown-escape";

export interface ReferenceType {
  name: string;
  description: string;
  examples: Example[];
  additional_examples: AdditionalExample[];
}

interface Example {
  markdown: string;
  html?: string;
}

interface AdditionalExample extends Example {
  name: string;
  description: string;
}

const Reference = (reference: ReferenceType) => {
  const { pop } = useNavigation();

  let mdString = `
   # ${reference.name}
   ---
   ${reference.description}
   
   ## Examples
   ---
  `;

  reference.examples.map((example) => {
    mdString += `\n${escapeMd(example.markdown)}\n`;
  });

  if (reference.additional_examples.length) {
    mdString += ` ## Additional Examples`;
    reference.additional_examples.map((additionalExample) => {
      mdString += `\n ## ${additionalExample.name}\n`;
      mdString += `${additionalExample.description}\n`;
      mdString += `\n${escapeMd(additionalExample.markdown)}\n`;
    });
  }

  return (
    <Detail
      markdown={mdString}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
};

export default Reference;
