import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Me = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  currency?: { main?: string };
  locale?: string;
  timezone?: string;
  country?: string;
  start_day?: number;
  pro?: unknown;
  limits?: Record<string, boolean>;
};

export default async function getMe() {
  const me = (await toshl.getMe()) as Me;

  return {
    id: me.id,
    email: me.email,
    name: [me.first_name, me.last_name].filter(Boolean).join(" ") || undefined,
    mainCurrency: me.currency?.main,
    locale: me.locale,
    timezone: me.timezone,
    country: me.country,
    monthStartsOnDay: me.start_day,
    hasPro: !!me.pro,
    limits: me.limits,
    _instructions: AI_INSTRUCTIONS,
  };
}
