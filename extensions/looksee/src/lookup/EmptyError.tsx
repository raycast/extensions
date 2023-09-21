import { Detail } from "@raycast/api";

interface EmptyErrorProps {
  targetAddress: string;
}

export const EmptyError = ({ targetAddress }: EmptyErrorProps) => (
  <Detail markdown={getEmptyErrorMarkdown(targetAddress)} />
);

const getEmptyErrorMarkdown = (targetAddress: string) => `
# Empty response 👀
> __${targetAddress}__

The lookup returned without any data.
`;
