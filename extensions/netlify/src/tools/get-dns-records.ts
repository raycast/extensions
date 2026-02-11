import api from '../utils/api';

type Input = {
  /* The netlify domain ID to get dns records for. If there is no zone ID specified, get it from get-domains tool. */
  zoneId: string;
};

export default async function ({ zoneId }: Input) {
  return await api.getDNSRecords(zoneId);
}
