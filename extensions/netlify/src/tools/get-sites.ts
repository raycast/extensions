import api from '../utils/api';

type Input = {
  /* The query to search by. If there is no query, use an empty string */
  query: string;
  /* The team slug to get domains for */
  teamSlug: string;
};

export default async function ({ query, teamSlug }: Input) {
  return api.getSites(query, teamSlug);
}
