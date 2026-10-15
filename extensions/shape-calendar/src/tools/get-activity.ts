import { getActivity } from "../api/client";

type Input = {
  /**
   * The ID of the activity to fetch
   */
  id: string;
};

export default async function (input: Input) {
  return getActivity(input.id);
}
