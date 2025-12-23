import { getTypesOfWork } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

export default async () => {
  const tokens = await getTokens();
  if (!tokens) {
    return undefined;
  }

  return getTypesOfWork(tokens.accessToken);
};
