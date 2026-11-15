import { Image } from "@raycast/api";

/**
 * GLPI Server Configuration.
 *
 * @example
 * const config: GlpiServer = {
 *    uuid: "a7029a9e-f933-4631-aed4-879fe6080e91",
 *    endpoint: "https://glpi.example.com/api.php/authorize",
 *    clientid: "chKWttGa6GK4zfuc75ZecNEe9Spoyemr2HCqMdhhxfTANv9Jhem5xxiUNXkTLTze"
 * }
 */
export interface GlpiServer {
  /**
   * UUID generated at Object init.
   */
  readonly uuid: string;

  /**
   * Server Name to display on UI.
   */
  name: string;

  /**
   * OAuth2 Endpoint.
   */
  endpoint: string;

  /**
   * OAuth2 Client ID.
   */
  clientid: string;

  /**
   * OAuth2 Client Secret.
   */
  clientsecret: string;
}

/**
 * Tickets RSQL query string.
 *
 * @example
 * const filter: Filter = {
 *  name: "Not Solved",
 *  query: "status.id=le=4",
 * }
 */
export interface Filter {
  /* Filter Name */
  name: string;
  /* Icon */
  icon: Image.ImageLike;
  /* RSQL quer string */
  query: string;
}
