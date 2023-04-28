import { Icon } from "@raycast/api";
import { GuardDetails } from "./GuardDetails";

interface Props {
  error: Error;
  onAction: () => void;
}

export const ErrorState = ({ error, onAction }: Props) => {
  const markdown = `
  ## Something went wrong on our end. 🥲

  Please report this issue in our [discord](https://discord.gg/34aBGqXD8N) so we can get it fixed.

  \`\`\`
  ${error.message}
  \`\`\`
  `;

  return <GuardDetails title="Retry" markdown={markdown} icon={Icon.RotateClockwise} onAction={onAction} />;
};
