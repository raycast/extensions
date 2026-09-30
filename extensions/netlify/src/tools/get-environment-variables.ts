import api from '../utils/api';

export default async function ({ siteId }: { siteId: string }) {
  return await api.getEnvVars(siteId);
}
