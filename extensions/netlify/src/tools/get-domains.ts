import api from '../utils/api';

type Input = {
  /* The team slug to get domains for */
  teamSlug: string;
};

export default async function ({ teamSlug }: Input) {
  return api.getDomains(teamSlug);
}
