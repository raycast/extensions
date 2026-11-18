import { getTypesOfWork } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

export default async () => {
  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  return getTypesOfWork(tokens.accessToken);
};
