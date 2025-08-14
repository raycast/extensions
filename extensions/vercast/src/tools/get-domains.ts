import { fetchDomains } from "../vercel";

type Input = {
  /* The vercel team ID to get domains for */
  teamId: string;
};

export default async function getDomains({ teamId }: Input) {
  return fetchDomains(teamId, 100);
}
