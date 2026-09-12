import { getOverview } from "../api/get-overview";

export default async function () {
  const overview = await getOverview();

  return overview;
}
