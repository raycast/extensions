import { GlpiApiClient } from "@api/glpi/main";
import {
  ResBodyGetAssistanceTicket,
  ResBodyGetAssistanceTicketTimelineFollowup,
  ResBodyGetDropdownFollowupTemplate,
} from "@api/glpi/types";

export let clientGlpi: GlpiApiClient | undefined;

/**
 * Init `clientGlpi`.
 *
 * @param endpoint - Glpi endpoint
 * @param clientid - Glpi OAuth2 clientid
 * @param clientsecret - Glpi OAuth2 clientsecret
 *
 * @returns reference to `clientGlpi` let.
 */
export function initClientGlpi(endpoint: string, clientid: string, clientsecret: string): GlpiApiClient {
  clientGlpi = new GlpiApiClient(endpoint, clientid, clientsecret);
  return clientGlpi;
}

/**
 * Get Glpi Tickets
 *
 * @param filter - Glpi RSQL query string
 * @param start - Start number
 * @param limit - Number of ticket to get.
 * @param order - Glpi ordering string.
 *
 * @returns Tickets
 */
export async function getAssistanceTickets(
  filter?: string,
  start?: number,
  limit?: number,
  order?: string,
): Promise<ResBodyGetAssistanceTicket> {
  if (!clientGlpi) {
    console.error("Fn: getAssistanceTickets. Function called with `clientGlpi` undefined.");
    throw new Error("Unexpected internal error. Function called with `clientGlpi` undefined.");
  }
  return await clientGlpi.getAssistanceTickets(filter, start, limit, order);
}

/**
 * Get Followups
 *
 * @param ticket_id - Ticket id.
 *
 * @returns Followups for given ticket id.
 */
export async function getAssistanceTicketFollowups(
  ticket_id: number,
): Promise<ResBodyGetAssistanceTicketTimelineFollowup> {
  if (!clientGlpi) {
    console.error("Fn: getAssistanceTickets. Function called with `clientGlpi` undefined.");
    throw new Error("Unexpected internal error. Function called with `clientGlpi` undefined.");
  }
  const followups = await clientGlpi.getAssistanceTicketTimelineFolloups(ticket_id);
  followups.sort((a, b) => b.item.id - a.item.id);
  return followups;
}

/**
 * Get Followup Templates
 *
 * @param filter - Glpi RSQL query string
 * @param start - Start number
 * @param limit - Number of followup templates to get.
 * @param order - Glpi ordering string.
 *
 * @returns Followup Templates
 */
export async function getDropdownFollowupTemplates(
  filter?: string,
  start?: number,
  limit?: number,
  order?: string,
): Promise<ResBodyGetDropdownFollowupTemplate> {
  if (!clientGlpi) {
    console.error("Fn: getDropdownFollowupTemplates. Function called with `clientGlpi` undefined.");
    throw new Error("Unexpected internal error. Function called with `clientGlpi` undefined.");
  }
  return await clientGlpi.getDropdownFollowupTemplates(filter, start, limit, order);
}
