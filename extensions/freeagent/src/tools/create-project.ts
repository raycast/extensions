import { Tool } from "@raycast/api";
import { createProject, fetchContacts, getCompanyInfo } from "../services/freeagent";
import { provider } from "../oauth";
import { ProjectCreateData } from "../types";

type Input = {
  /**
   * Name of the new project
   */
  name: string;
  /**
   * Either the full contact URL (preferred) or a contact name to match. Use list-contacts or
   * fetchContacts to find URLs.
   */
  contact: string;
  /**
   * Status — defaults to "Active"
   */
  status?: "Active" | "Completed" | "Cancelled" | "Hidden";
  /**
   * Currency (ISO code, e.g. "GBP"). Defaults to the company currency.
   */
  currency?: string;
  /**
   * Optional budget value (numeric, in budgetUnits)
   */
  budget?: number;
  /**
   * Units for the budget: "Hours", "Days", or "Monetary"
   */
  budgetUnits?: "Hours" | "Days" | "Monetary";
  /**
   * Default billing rate for new tasks in this project
   */
  normalBillingRate?: string;
  /**
   * Billing period for the rate ("hour", "day", "week", "month", "year")
   */
  billingPeriod?: "hour" | "day" | "week" | "month" | "year";
  /**
   * Project start date (YYYY-MM-DD)
   */
  startsOn?: string;
  /**
   * Project end date (YYYY-MM-DD)
   */
  endsOn?: string;
};

async function resolveContactUrl(token: string, contact: string): Promise<{ url: string; display: string } | null> {
  if (contact.startsWith("http")) {
    return { url: contact, display: contact };
  }
  const contacts = await fetchContacts(token);
  const q = contact.toLowerCase();
  const match = contacts.find((c) => {
    const org = (c.organisation_name || "").toLowerCase();
    const name = `${c.first_name || ""} ${c.last_name || ""}`.trim().toLowerCase();
    return org.includes(q) || name.includes(q);
  });
  if (!match) return null;
  return { url: match.url, display: match.organisation_name || `${match.first_name} ${match.last_name}` };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Create project "${input.name}"?`,
    info: [
      { name: "Name", value: input.name },
      { name: "Contact", value: input.contact },
      { name: "Status", value: input.status || "Active" },
      { name: "Currency", value: input.currency || "(company default)" },
      ...(input.budget !== undefined
        ? [{ name: "Budget", value: `${input.budget} ${input.budgetUnits || "Hours"}` }]
        : []),
      ...(input.normalBillingRate
        ? [{ name: "Billing Rate", value: `${input.normalBillingRate}/${input.billingPeriod || "hour"}` }]
        : []),
    ],
  };
};

/**
 * Create a new project in FreeAgent. Confirmation required before execution.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    if (!input.name) return "❌ Project name is required.";
    if (!input.contact) return "❌ Contact (URL or name) is required.";

    const resolved = await resolveContactUrl(token, input.contact);
    if (!resolved) {
      return `❌ No contact found matching "${input.contact}". Provide the full contact URL or a recognisable name.`;
    }

    let currency = input.currency;
    if (!currency) {
      const company = await getCompanyInfo(token);
      currency = company.currency;
    }

    const data: ProjectCreateData = {
      name: input.name,
      contact: resolved.url,
      status: input.status || "Active",
      currency,
    };
    if (input.budget !== undefined) data.budget = input.budget;
    if (input.budgetUnits) data.budget_units = input.budgetUnits;
    if (input.normalBillingRate) data.normal_billing_rate = input.normalBillingRate;
    if (input.billingPeriod) data.billing_period = input.billingPeriod;
    if (input.startsOn) data.starts_on = input.startsOn;
    if (input.endsOn) data.ends_on = input.endsOn;

    const project = await createProject(token, data);

    return (
      `✅ **Project created**\n\n` +
      `📂 **${project.name}**\n` +
      `• Client: ${project.contact_name}\n` +
      `• Status: ${project.status}\n` +
      `• Currency: ${project.currency}\n` +
      `• URL: ${project.url}\n`
    );
  } catch (error) {
    console.error("Create project error:", error);
    return `❌ Unable to create project. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
