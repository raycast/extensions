import { getAreas } from '../api';

export default async function () {
  const areas = await getAreas();
  return areas;
}
