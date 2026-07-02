import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, subDays } from "date-fns";

type Input = {
  from?: string;
  to?: string;
};

export default async function listEntryLocations(input: Input) {
  const today = new Date();
  const from = input.from || format(subDays(today, 90), "yyyy-MM-dd");
  const to = input.to || format(today, "yyyy-MM-dd");

  const data = await toshl.getEntryLocations({ from, to, per_page: 200 });

  return {
    from,
    to,
    locations: data,
    _instructions: AI_INSTRUCTIONS,
  };
}
