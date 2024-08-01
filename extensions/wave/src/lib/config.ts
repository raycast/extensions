import { getPreferenceValues } from "@raycast/api";

export const API_URL = "https://gql.waveapps.com/graphql/public";
const API_TOKEN = getPreferenceValues<Preferences>().access_token;

export const API_HEADERS = {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json"
}

export const INVOICE_STATUSES = {DRAFT: "The invoice is still a draft.",
OVERDUE: "The invoice is overdue.",
OVERPAID: "The invoice was overpaid.",
PAID: "The invoice was paid.",
PARTIAL: "The invoice was partially paid.",
SAVED: "The invoice was saved.",
SENT: "The invoice was sent.",
UNPAID: "The invoice is unpaid.",
VIEWED: "The invoice was viewed."}