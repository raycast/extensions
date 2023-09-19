import { Detail } from "@raycast/api";

interface EmptyResponseViewProps {
  targetAddress: string;
}

export const EmptyError = ({ targetAddress }: EmptyResponseViewProps) => (
  <Detail navigationTitle="Empty response" markdown={getEmptyErrorMarkdown(targetAddress)} />
);

const getEmptyErrorMarkdown = (targetAddress: string) => `
# Empty response 👀
> __${targetAddress}__

The lookup returned without any data.
`;
