import { Polar } from "@polar-sh/sdk";

export const buildPolarClient = (accessToken?: string) => {
  return new Polar({
    accessToken,
  });
};
