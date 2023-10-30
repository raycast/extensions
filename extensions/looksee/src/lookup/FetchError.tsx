import { Detail } from "@raycast/api";

interface FetchErrorProps {
  targetAddress: string;
  error: Error;
}

export const FetchError = ({ targetAddress, error }: FetchErrorProps) => (
  <Detail markdown={getFetchErrorMarkdown(targetAddress, error)} />
);

const getFetchErrorMarkdown = (targetAddress: string, error: Error) => `
# Fetch error ⚠️
> __${targetAddress}__

An error occurred while communicating with the external lookup api.
If the problem persists please report this to the extensions creator.  

__Message from API__:  
_${error?.message}_
`;
