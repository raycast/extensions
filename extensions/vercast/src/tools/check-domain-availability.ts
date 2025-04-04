import { checkDomainAvailability as checkDomainAvailabilityFunction } from "../vercel";

type Input = {
  domain: string;
};

export default async function checkDomainAvailability({ domain }: Input) {
  return checkDomainAvailabilityFunction(domain);
}
