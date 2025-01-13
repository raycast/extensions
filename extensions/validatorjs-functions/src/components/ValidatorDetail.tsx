// src/components/ValidatorDetail.tsx

import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { ValidatorFunctionWithImpl } from "../types";

/**
 * Props interface for the ValidatorDetail component.
 * @property {ValidatorFunctionWithImpl} validator - The validator object containing details to display.
 */
interface Props {
  validator: ValidatorFunctionWithImpl;
}

/**
 * Renders a detailed view of a validator function, including its implementation,
 * examples, and notes. Provides actions for copying code snippets and accessing
 * external resources.
 *
 * @param {Props} props - The props for the component.
 * @returns {JSX.Element} The rendered detail component.
 */
export function ValidatorDetail({ validator }: Props): JSX.Element {
  // Destructure the validator object for easier access to its properties
  const { signature, description, fullImplementation, examples, notes, name } = validator;

  // Construct the markdown content for the detail view
  const markdown = `
# ${signature}
${description}

## Implementation
\`\`\`typescript
${fullImplementation}
\`\`\`

${examples ? `## Examples\n\`\`\`typescript\n${examples}\n\`\`\`` : ""}

${notes ? `## Notes\n${notes}` : ""}
`;

  /**
   * Handles the action of copying content to the clipboard and showing a success toast.
   *
   * @param {string} content - The content to be copied to the clipboard.
   * @param {string} title - The title of the toast notification.
   * @param {string} [message] - An optional message for the toast notification.
   */
  const handleCopy = (content: string, title: string, message?: string) => {
    showToast({
      style: Toast.Style.Success,
      title,
      message,
    });
  };

  return (
    <Detail
      markdown={markdown}
      navigationTitle={name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Implementation"
              content={fullImplementation}
              onCopy={() => handleCopy(fullImplementation, `Copied ${name} implementation!`)}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy ES Module Import"
              content={`import { ${name} } from 'validator';`}
              onCopy={() => handleCopy(`import { ${name} } from 'validator';`, "Copied ES Module import")}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy CommonJS Import"
              content={`const { ${name} } = require('validator');`}
              onCopy={() => handleCopy(`const { ${name} } = require('validator';`, "Copied CommonJS import")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Visit Official Repository"
              url="https://github.com/validatorjs/validator.js"
              icon={Icon.Globe}
            />
            <Action
              title="Copy npm Install Command"
              icon={Icon.CopyClipboard}
              onAction={() => handleCopy("npm install validator", "Copied to clipboard", "npm install validator")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
