import { MissingApiToken, getApiToken } from "./api";
import { EntryForm } from "./entry-form";

export default function Command() {
  const apiToken = getApiToken();

  if (!apiToken) {
    return <MissingApiToken />;
  }

  return <EntryForm apiToken={apiToken} mode="create" />;
}
