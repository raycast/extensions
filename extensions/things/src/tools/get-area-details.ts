import { queryAreaDetails } from '../api';

type Input = {
  /** The ID of the area to retrieve full details for. */
  areaId: string;
};

export default async function ({ areaId }: Input) {
  if (!areaId?.trim()) {
    throw new Error('areaId is required.');
  }
  const details = await queryAreaDetails(areaId.trim());
  if (!details) {
    throw new Error(`Area with ID "${areaId}" not found.`);
  }
  return details;
}
