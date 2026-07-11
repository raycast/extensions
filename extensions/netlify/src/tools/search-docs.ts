import api from '../utils/api';

export default async function ({ query }: { query: string }) {
  return api.searchDocs(query);
}
