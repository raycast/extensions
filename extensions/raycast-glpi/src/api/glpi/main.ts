import { LocalStorage } from "@raycast/api";
import type * as Types from "./types";

const COOLDOWN_MS = 60000;
const TIMEOUT = 3000;

const offlineServers = new Map<string, number>();

/**
 * GlpiApi Error.
 *
 * Extend `Error` with:
 * - error message
 * - error code
 * - original error
 *
 * @example
 * ``ts
 * throw new GlpiApiError(
 *  "Error message",
 *  "GLPI_API_SERVER_UNREACHABLE_COOLDOWN",
 *  { cause: error }
 * });
 * ``
 */
export class GlpiApiError extends Error {
  /**
   * Init new instance of GlpiApiError.
   *
   * @param message - error message
   * @param code - error code
   * @param options.cause - original error
   */
  constructor(
    message: string,
    readonly code: Types.ErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GlpiApiError";
  }
}

/**
 * Client for interact with Glpi v2 API.
 */
export class GlpiApiClient {
  /**
   * OAuth2 Endpoint.
   */
  readonly #endpoint: URL;

  /**
   * OAuth2 Client ID.
   */
  readonly #clientid: string;

  /**
   * OAuth2 Client Secret.
   */
  readonly #clientsecret: string;

  /**
   * Authentication Token
   */
  #token?: Types.Token;

  /* Route: Session */
  readonly #apiRouteToken = "api.php/token";
  readonly #apiRouteSession = "api.php/session";

  /* Route: Assistance Ticket */
  readonly #apiRouteAssistanceTicket = "api.php/Assistance/Ticket";
  readonly #apiRouteAssistanceTicketId = (id: number) => `${this.#apiRouteAssistanceTicket}/${String(id)}`;
  readonly #apiRouteAssistanceTicketIdTeamMember = (id: number) =>
    `${this.#apiRouteAssistanceTicket}/${String(id)}/TeamMember`;
  readonly #apiRouteAssistanceTicketTimelineFollowup = (id: number) =>
    `${this.#apiRouteAssistanceTicket}/${String(id)}/Timeline/Followup`;

  /* Route: Dropdowns */
  readonly #apiRouteDropdownFollowupTemplate = "api.php/Dropdowns/FollowupTemplate";

  /**
   * Init instance of GlpiApi.
   *
   * @param endpoint - OAuth2 Endpoint.
   * @param clientid - OAuth2 Client ID.
   * @param clientsecret  - OAuth2 Secret.
   *
   * @example
   * ``ts
   * const client = new GlpiApi(
   *  "https://glpi.example.com/",
   *  "f2AfDHrTUvtr2teDoSsvr&WfVGtco!#Dv$tiE6YC@oC@bg%f$p@Arm^GR48aCYdv",
   *  "GSbhm%5@j&*H6Xz^rD4HhiywL*g*gMJQCEKV2Cn^3p2&YogH2WFYczQ&hYxDcWvw",
   * );
   * ``
   */
  constructor(endpoint: string, clientid: string, clientsecret: string) {
    this.#endpoint = new URL(endpoint);
    this.#clientid = clientid;
    this.#clientsecret = clientsecret;
  }

  /**
   * Set `this.#token` and save value on LocalStorage.
   *
   * @param token - Response Body from api route `this.#apiRouteToken`
   */
  private set token(token: Types.ResBodyToken) {
    this.#token = {
      token: `${token.token_type} ${token.access_token}`,
      exprires_at: Date.now() + token.expires_in * 1000,
      refresh_token: token.refresh_token,
    };
    console.debug("Class: GlpiApiClient, Fn: set token. Set `this.#token`.", { token, paresedToken: this.#token });

    /* Store token on LocalStorage */
    const key = `token:${this.#endpoint}`;
    LocalStorage.setItem(key, JSON.stringify(this.#token));
    console.debug(`Class: GlpiApiClient, Fn: set token. Token stored on LocalStorage.`, {
      key,
      parsedToken: this.#token,
    });
  }

  /**
   * Check If Token Expired.
   *
   * @param token - check `token` validity instead of `this.#token`.
   *
   * @returns `true` if token expired, `false` if token is valid.
   */
  #isTokenExpired(token?: Types.Token): boolean {
    if (token) return Date.now() + 5000 > (token.exprires_at ?? Date.now() + 5001);
    return (
      this.#token?.token === undefined ||
      this.#token.exprires_at === undefined ||
      Date.now() + 5000 > this.#token.exprires_at
    );
  }

  /**
   * Check if Endpoint is in OFFLINE_SERVERS Map.
   *
   * throw GlpiApiError if endpoint is in Cooldown mode.
   */
  async #cooldownCheck(): Promise<void> {
    if (offlineServers.has(this.#endpoint.href)) {
      if (Date.now() < (offlineServers.get(this.#endpoint.href) ?? 0)) {
        console.debug(`Class: GlpiApiClient, Fn: #cooldownCheck. Server '${this.#endpoint.href}' in cooldown.`);
        throw new GlpiApiError(
          "Glpi Server is Unreachable, retry later. (Cooldown)",
          "GLPI_API_SERVER_UNREACHABLE_COOLDOWN",
        );
      } else {
        console.debug(`Class: GlpiApiClient, Fn: #cooldownCheck. Server '${this.#endpoint.href}' cooldown expired.`);
        offlineServers.delete(this.#endpoint.href);
      }
    }
  }

  /**
   * Restore token from LocalStorage.
   *
   * @returns token
   */
  async #restoreToken(): Promise<void> {
    const key = `token:${this.#endpoint}`;
    const tokenRaw = await LocalStorage.getItem<string>(key);

    console.debug(`Class: GlpiApiClient, Fn: #restoreToken. Restore token from LocalStorage.`, { key });

    if (!tokenRaw) {
      console.debug(`Class: GlpiApiClient, Fn: #restoreToken. Restore token failed, empty LocalStorage.`, { key });
      throw new GlpiApiError(`Authentication with password is required.`, "GLPI_API_SERVER_AUTH_EXPIRED");
    }

    try {
      this.#token = JSON.parse(tokenRaw);
      console.debug(`Class: GlpiApiClient, Fn: #restoreToken. Restore token success.`, { key, token: this.#token });
    } catch (e) {
      console.warn("Class: GlpiApiClient, Fn: #restoreToken. Restore token failed, malformed JSON.", {
        key,
        tokenRaw,
        e,
      });
      throw new GlpiApiError(`Authentication with password is required.`, "GLPI_API_SERVER_AUTH_EXPIRED");
    }
  }

  /**
   * Set `Authorization` header on passed `headers` handling token refresh.
   *
   * @param headers - Request headers.
   */
  async #headersSetToken(headers: Headers): Promise<void> {
    /* Try to restore token from LocalStorage if undefined */
    if (!this.#token) {
      await this.#restoreToken();
    }

    /* Check if token is exipred requesting a new one if expired */
    if (this.#isTokenExpired()) {
      console.debug("Class: GlpiApiClient, Fn: #headersSetToken. Token expired, requesting a new one.");
      this.token = await this.getTokenWithRefreshToken();
    }

    if (this.#token) headers.set("Authorization", this.#token.token);
    else
      throw new GlpiApiError(
        "Error setting up `Authorization` header. `token` is undefined.",
        "GLPI_API_SERVER_AUTH_ERROR",
      );
  }

  /**
   * Handle Glpi Api Server Errors
   *
   * @param url - Api Url
   * @param error
   *
   * @returns GlpiApiError
   */
  #reqErrorHandler(error: Error): GlpiApiError {
    /* Handle GlpiApiError */
    if (error instanceof GlpiApiError) return error;

    /* Handle SyntaxError */
    if (error instanceof SyntaxError)
      return new GlpiApiError("Unexpected json response", "GLPI_API_SERVER_RESPONSE_SYNTAX", { cause: error });

    /* Handle AbortError | ENOTFOUND */
    if (error.name === "AbortError" || ("code" in error && error.code === "ENOTFOUND")) {
      offlineServers.set(this.#endpoint.href, Date.now() + COOLDOWN_MS);
      return new GlpiApiError("Glpi server unreachable", "GLPI_API_SERVER_UNREACHABLE");
    }

    /* Handle Error */
    console.error("Class: GlpiApiClient, Fn: #reqErrorHandler.", { error });
    return new GlpiApiError("Glpi server unexpected error", "GLPI_API_SERVER", { cause: error });
  }

  /**
   * Handle Response Error from Glpi Api.
   *
   * @param response - Response from Glpi Api.
   *
   * @returns `GlpiApiError` or undefined if `response.ok` is true.
   */
  async #reqResponseErrorHandler(response: Response): Promise<GlpiApiError | undefined> {
    if (response.ok) return;

    /* Try to get error message */
    let message: Types.ResBodyError | undefined;
    try {
      message = await response.json();
    } catch (e) {
      console.warn(`Class: GlpiApiError, Fn: #reqResponseErrorHandler. Unexpected json response.`, { e });
    }

    console.debug(`Class: GlpiApiError, Fn: #reqResponseErrorHandler. Error message.`, {
      response_status: response.status,
      response_status_text: response.statusText,
      message,
    });

    /* HTTP 400 */
    if (response.status === 400) {
      /* Invalid Grant: refresh token is invalid */
      if (message?.error === "invalid_grant" && message.error_description === "The refresh token is invalid.")
        return new GlpiApiError("Session expired. Please reautenticate.", "GLPI_API_SERVER_AUTH_EXPIRED");

      /* Invalid Grant: user credentials were invalid */
      if (message?.error === "invalid_grant" && message.error_description === "The user credentials were incorrect.")
        return new GlpiApiError(message.error_description, "GLPI_API_SERVER_AUTH_ERROR");
    }

    /* HTTP 401 */
    if (response.status === 401)
      return new GlpiApiError(
        `Glpi Credential Error. Wrong OAuth2 settings or username or password`,
        "GLPI_API_SERVER_RESPONSE_401",
      );

    /* Default */
    return new GlpiApiError(
      `HTTP Error Code ${response.status}, ${response.statusText}.`,
      "GLPI_API_SERVER_RESPONSE_ERROR",
    );
  }

  /**
   * Glpi Api Generic Post.
   *
   * @param url - Api Full Url.
   * @param body - Body Request.
   * @param [tokenRequired=true] - Set to false if authorization token is not required.
   *
   * @returns `T` where is the expected response interface.
   */
  async #post<T>(url: URL, body: Types.ReqBody, tokenRequired = true): Promise<T | undefined> {
    try {
      /* Check Cooldown Map */
      await this.#cooldownCheck();

      /* Headers */
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (tokenRequired) await this.#headersSetToken(headers);

      /* AbortController */
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      console.debug("Class: GlpiApiClient, Fn: #post. Request.", { url: url.href, headers });

      /* POST request */
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      console.debug("Class: GlpiApiClient, Fn: #post. Response.", {
        url: url.href,
        response_status: response.status,
        response_status_text: response.statusText,
      });

      /* Clear Timeout */
      clearTimeout(timeoutId);

      /* Check response code */
      if (!response.ok) {
        const error = await this.#reqResponseErrorHandler(response);
        if (error) throw error;
      }

      /* Parse json */
      const json = response.json();
      return json;
    } catch (e) {
      const error =
        e instanceof Error ? e : new GlpiApiError(`Error on Post '${url.href}'`, "GLPI_API_SERVER_POST", { cause: e });
      throw this.#reqErrorHandler(error);
    }
  }

  /**
   * Glpi Api Generic Patch.
   *
   * @param url - Api Full Url.
   * @param body - Body Request.
   * @param [tokenRequired=true] - Set to false if authorization token is not required.
   *
   * @returns `T` where is the expected response interface.
   */
  async #patch<T>(url: URL, body: Types.ReqBody, tokenRequired = true): Promise<T | undefined> {
    try {
      /* Check Cooldown Map */
      await this.#cooldownCheck();

      /* Headers */
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (tokenRequired) await this.#headersSetToken(headers);

      /* AbortController */
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      console.debug("Class: GlpiApiClient, Fn: #patch. Request.", { url: url.href, headers });

      /* PATCH request */
      const response = await fetch(url, {
        method: "PATCH",
        headers: headers,
        signal: controller.signal,
        body: JSON.stringify(body),
      });

      console.debug("Class: GlpiApiClient, Fn: #patch. Response.", {
        url: url.href,
        response_status: response.status,
        response_status_text: response.statusText,
      });

      /* Clear Timeout */
      clearTimeout(timeoutId);

      /* Check response code */
      if (!response.ok) {
        const error = await this.#reqResponseErrorHandler(response);
        if (error) throw error;
      }

      /* Parse json */
      const json = response.json();
      return json;
    } catch (e) {
      const error =
        e instanceof Error ? e : new GlpiApiError(`Error on Patch '${url.href}'`, "GLPI_API_SERVER_POST", { cause: e });
      throw this.#reqErrorHandler(error);
    }
  }

  /**
   * Glpi Api Generic Get.
   *
   * @param url - Api Full Url.
   *
   * @returns `T` where is the expected response interface.
   */
  async #get<T>(url: URL): Promise<T | undefined> {
    try {
      /* Check Cooldown Map */
      await this.#cooldownCheck();

      /* Headers */
      const headers = new Headers({
        Accept: "application/json",
      });
      await this.#headersSetToken(headers);

      /* AbortController */
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      console.debug("Class: GlpiApiClient, Fn: #get. Request.", {
        url: url.href,
        params: url.searchParams.entries(),
        headers,
      });

      /* POST request */
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
        signal: controller.signal,
      });

      console.debug("Class: GlpiApiClient, Fn: #get. Response.", {
        url: url.href,
        response_status: response.status,
        response_status_text: response.statusText,
      });

      /* Clear Timeout */
      clearTimeout(timeoutId);

      /* Check response code */
      if (!response.ok) {
        const error = await this.#reqResponseErrorHandler(response);
        if (error) throw error;
      }

      /* Parse json */
      const json = response.json();
      return json;
    } catch (e) {
      const error =
        e instanceof Error ? e : new GlpiApiError(`Error on Post '${url.href}'`, "GLPI_API_SERVER_GET", { cause: e });
      throw this.#reqErrorHandler(error);
    }
  }

  /**
   * Get token with OAuth2 Client `password` method.
   *
   * @param username
   * @param password
   *
   * @returns Glpi Server Response with token.
   */
  async getTokenWithPassword(username: string, password: string): Promise<Types.ResBodyToken> {
    console.debug("Class: GlpiApiClient, Fn: getTokenWithPassowrd. New token requested.");

    /* Request */
    const url = new URL(this.#apiRouteToken, this.#endpoint);
    const reqBody: Types.ReqBodyToken = {
      grant_type: "password",
      client_id: this.#clientid,
      client_secret: this.#clientsecret,
      username: username,
      password: password,
      scope: "api",
    };

    /* Request new Authorization token */
    const token = await this.#post<Types.ResBodyToken>(url, reqBody, false);
    if (!token) throw new GlpiApiError(`Empty Response on Post '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    /* Save token and expiration date */
    this.token = token;

    return token;
  }

  /**
   * Get token with OAuth2 Client `refresh_token` method.
   *
   * @returns Glpi Server Response with token.
   */
  async getTokenWithRefreshToken(): Promise<Types.ResBodyToken> {
    console.debug("Class: GlpiApiClient, Fn: getTokenWithRefreshToken. New token requested.");

    /* Restore token from LocalStorage if undefined */
    if (!this.token) await this.#restoreToken();

    /* Request */
    const url = new URL(this.#apiRouteToken, this.#endpoint);
    const reqBody: Types.ReqBodyToken = {
      grant_type: "refresh_token",
      client_id: this.#clientid,
      client_secret: this.#clientsecret,
      refresh_token: this.#token?.refresh_token,
      scope: "api",
    };

    /* Request new Authorization token */
    const token = await this.#post<Types.ResBodyToken>(url, reqBody, false);
    if (!token) throw new GlpiApiError(`Empty Response on Post '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    /* Save token and expiration date */
    this.token = token;

    return token;
  }

  /**
   * Get Session.
   */
  async getSession(): Promise<Types.ResBodyGetSession> {
    console.debug("Class: GlpiApiClient, Fn: getSession. New request.");

    /* Request */
    const url = new URL(this.#apiRouteSession, this.#endpoint);

    const user = await this.#get<Types.ResBodyGetSession>(url);
    if (!user) throw new GlpiApiError(`Empty Response on Post '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: getSession. Request done.", { user });
    return user;
  }

  /**
   * Get Tickets.
   *
   *  @param filter - RSQL query string.
   *
   *  @returns Tickets.
   */
  async getAssistanceTickets(
    filter?: string,
    start?: number,
    limit?: number,
    sort?: string,
  ): Promise<Types.ResBodyGetAssistanceTicket> {
    console.debug("Class: GlpiApiClient, Fn: getAssistanceTickets. New request.", { filter, start, limit, sort });

    /* Request */
    const url = new URL(this.#apiRouteAssistanceTicket, this.#endpoint);
    if (filter) url.searchParams.set("filter", filter);
    if (start) url.searchParams.set("start", String(start));
    if (limit) url.searchParams.set("limit", String(limit));
    if (sort) url.searchParams.set("sort", sort);

    const tickets = await this.#get<Types.ResBodyGetAssistanceTicket>(url);
    if (!tickets) throw new GlpiApiError(`Empty Response on Post '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: getAssistanceTickets. Request done.", { tikets: tickets.length });
    return tickets;
  }

  /**
   * Patch Ticket
   *
   * @param id - Ticket Id to modify
   * @param ticket - Ticket value to edit.
   *
   * @returns modified ticket.
   */
  async patchAssistanceTicket(id: number, ticket: Types.TicketPatch): Promise<Types.ResBodyPatchAssistanceTicket> {
    console.debug("Class: GlpiApiClient, Fn: patchAssistanceTickets. New request.", { id, ticket });

    /* Request */
    const url = new URL(this.#apiRouteAssistanceTicketId(id), this.#endpoint);

    const modTicket = await this.#patch<Types.ResBodyPatchAssistanceTicket>(url, ticket);
    if (!modTicket) throw new GlpiApiError(`Empty Response on Post '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: patchAssistanceTickets. Request done.", { modTicket });
    return modTicket;
  }

  /**
   * Post Ticket TeamMember
   *
   * @param id - Ticket Id.
   * @param teamMember - TeamMember to add.
   *
   * @returns Data response from server.
   */
  async postAssistanceTicketTeamMember(
    id: number,
    teamMember: Types.TeamMemberPost,
  ): Promise<Types.ResBodyPostAssistanceTicketTeamMember> {
    console.debug("Class: GlpiApiClient, Fn: postAssistanceTicketTeamMember. New request.", { id, teamMember });

    /* Request */
    const url = new URL(this.#apiRouteAssistanceTicketIdTeamMember(id), this.#endpoint);

    const data = await this.#post<Types.ResBodyPostAssistanceTicketTeamMember>(url, teamMember);
    if (!data) throw new GlpiApiError(`Empty Response on Get '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: postAssistanceTicketTeamMember. Request done.", { id, teamMember, data });
    return data;
  }

  /**
   * Get Ticket Followups
   *
   * @param id - Ticket Id.
   *
   * @returns Followups for given ticket id.
   */
  async getAssistanceTicketTimelineFolloups(id: number): Promise<Types.ResBodyGetAssistanceTicketTimelineFollowup> {
    console.debug("Class: GlpiApiClient, Fn: getAssistanceTicketTimelineFolloups. New request.", { id });

    /* Request */
    const url = new URL(this.#apiRouteAssistanceTicketTimelineFollowup(id), this.#endpoint);

    const followups = await this.#get<Types.ResBodyGetAssistanceTicketTimelineFollowup>(url);
    if (!followups) throw new GlpiApiError(`Empty Response on Get '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: getAssistanceTicketTimelineFolloups. Request done.", {
      id,
      followups: followups.length,
    });
    return followups;
  }

  /**
   * Post Ticket Followups
   *
   * @param id - Ticket Id.
   * @param followup - Followup to create.
   *
   * @returns The created followup.
   */
  async postAssistanceTicketTimelineFollowup(
    id: number,
    followup: Types.FollowupPost,
  ): Promise<Types.ResBodyPostAssistanceTicketTimelineFollowup> {
    console.debug("Class: GlpiApiClient, Fn: postAssistanceTicketTimelineFolloups. New request.", { id, followup });

    /* Request */
    const url = new URL(this.#apiRouteAssistanceTicketTimelineFollowup(id), this.#endpoint);

    const newFollowup = await this.#post<Types.ResBodyPostAssistanceTicketTimelineFollowup>(url, followup);
    if (!newFollowup) throw new GlpiApiError(`Empty Response on Get '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: postAssistanceTicketTimelineFolloups. Request done.", { id, newFollowup });
    return newFollowup;
  }

  /**
   * Get Followup Templates
   *
   * @param filter - RSQL query string.
   * @param start - Start number.
   * @param limit - Number of followup templates to get.
   * @param sort - Glpi ordering string.
   *
   * @returns Followup Templates.
   */
  async getDropdownFollowupTemplates(
    filter?: string,
    start?: number,
    limit?: number,
    sort?: string,
  ): Promise<Types.ResBodyGetDropdownFollowupTemplate> {
    console.debug("Class: GlpiApiClient, Fn: getDropdownFollowupTemplates. New request.", {
      filter,
      start,
      limit,
      sort,
    });

    /* Request */
    const url = new URL(this.#apiRouteDropdownFollowupTemplate, this.#endpoint);
    if (filter) url.searchParams.set("filter", filter);
    if (start) url.searchParams.set("start", String(start));
    if (limit) url.searchParams.set("limit", String(limit));
    if (sort) url.searchParams.set("sort", sort);

    const templates = await this.#get<Types.ResBodyGetDropdownFollowupTemplate>(url);
    if (!templates) throw new GlpiApiError(`Empty Response on Get '${url.href}'`, "GLPI_API_SERVER_RESPONSE_EMPTY");

    console.debug("Class: GlpiApiClient, Fn: getDropdownFollowupTemplates. Request done.", {
      templates: templates.length,
    });
    return templates;
  }
}
