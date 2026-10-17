import type * as Types from "./types";
import { isZabbixResponseError } from "./types";

/* Map offline Zabbix Server. Key is the url.*/
const offlineServer = new Map<string, number>();
const COOLDOWN_MS = 60000;

export class ZabbixClient {
  private readonly _url: string;
  private readonly _key: string;

  constructor(config: Types.ZabbixServerConfig) {
    /* Zabbix Server Config */
    this._url = config.url;
    this._key = config.key;
  }

  /* API Generic Request */
  private async ZabbixPost<T = Types.ZabbixResponse>(
    body: Types.ZabbixPost,
    auth = true,
  ): Promise<T> {
    /* Check Cooldown */
    if (offlineServer.has(this._url)) {
      if (Date.now() < (offlineServer.get(this._url) ?? 0))
        throw new Error(
          "Zabbix Server is Unreachable, retry later. (Cooldown)",
        );
      else offlineServer.delete(this._url);
    }

    /* Heders */
    const headers = new Headers({
      "Content-Type": "application/json-rpc",
    });
    if (auth) headers.set("Authorization", `Bearer ${this._key}`);

    /* AbortController */
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    /* Request */
    const req: RequestInit = {
      method: "POST",
      headers: headers,
      signal: controller.signal,
      body: JSON.stringify(body),
    };

    try {
      /* Zabbix API Fetch */
      const response = await fetch(this._url, req);

      /* Clear Timeout */
      clearTimeout(timeoutId);

      if (!response.ok) {
        await response.text().catch(() => {});
        throw new Error(`HTTP Error Code: ${response.status}`);
      }

      /* Get JSON Response */
      const data = await response.json();

      /* If Response contain Error Throw Error */
      if (isZabbixResponseError(data))
        throw new Error(
          `Zabbix Server Error. Code: "${data.error.code}", Message: "${data.error.message}, Data: ${data.error.data}"`,
        );

      /* Return Data */
      return data;
    } catch (error) {
      /* Clear Timeout */
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        /* Add Server to offlineServer */
        offlineServer.set(this._url, Date.now() + COOLDOWN_MS);
        throw new Error(`Zabbix Server is Unreachable`);
      }
      throw error;
    }
  }

  /* API Mothod: 'apiinfo.version' */
  async MethodApiInfoVersion(): Promise<Types.ZabbixResponseApiInfoVersion> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "apiinfo.version",
      params: {},
      id: 1,
    };

    /* Post */
    const response = await this.ZabbixPost<Types.ZabbixResponseApiInfoVersion>(
      body,
      false,
    );

    return response;
  }

  /* API Mothod: 'host.get' */
  async MethodHostGet(
    params: Types.ZabbixParamsHostGet,
  ): Promise<Types.ZabbixResponseHostGet> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "host.get",
      params: params,
      id: 1,
    };

    /* Post */
    const response = await this.ZabbixPost<Types.ZabbixResponseHostGet>(body);
    return response;
  }

  /* API Mothod: 'host.update' */
  async MethodHostUpdate(
    params: Types.ZabbixParamsHostUpdate,
  ): Promise<Types.ZabbixResponseHostUpdate> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "host.update",
      params: params,
      id: 1,
    };

    /* Post */
    const response =
      await this.ZabbixPost<Types.ZabbixResponseHostUpdate>(body);
    return response;
  }

  /* API Mothod: 'host.delete' */
  async MethodHostDelete(
    params: string[],
  ): Promise<Types.ZabbixResponseHostDelete> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "host.delete",
      params: params,
      id: 1,
    };

    /* Post */
    const response =
      await this.ZabbixPost<Types.ZabbixResponseHostDelete>(body);
    return response;
  }

  /* API Mothod: 'item.get' */
  async MethodItemGet(
    params: Types.ZabbixParamsItemGet,
  ): Promise<Types.ZabbixResponseItemGet> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "item.get",
      params: params,
      id: 1,
    };

    /* Post */
    const response = await this.ZabbixPost<Types.ZabbixResponseItemGet>(body);
    return response;
  }

  /* API Mothod: 'trigger.get' */
  async MethodTriggerGet(
    params: Types.ZabbixParamsTriggerGet,
  ): Promise<Types.ZabbixResponseTriggerGet> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "trigger.get",
      params: params,
      id: 1,
    };

    /* Post */
    const response =
      await this.ZabbixPost<Types.ZabbixResponseTriggerGet>(body);
    return response;
  }

  /* API Mothod: 'trigger.update' */
  async MethodTriggerUpdate(
    params: Types.ZabbixParamsTriggerUpdate,
  ): Promise<Types.ZabbixResponseTriggerUpdate> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "trigger.update",
      params: params,
      id: 1,
    };

    /* Post */
    const response =
      await this.ZabbixPost<Types.ZabbixResponseTriggerUpdate>(body);
    return response;
  }

  /* API Mothod: 'event.get' */
  async MethodEventGet(
    params: Types.ZabbixParamsEventGet,
  ): Promise<Types.ZabbixResponseEventGet> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "event.get",
      params: params,
      id: 1,
    };

    /* Post */
    const response = await this.ZabbixPost<Types.ZabbixResponseEventGet>(body);
    return response;
  }

  /* API Mothod: 'event.acknowledge' */
  async MethodEventAcknowledge(
    params: Types.ZabbixPostEventAcknowledgeParams,
  ): Promise<Types.ZabbixResponseEventAcknowledge> {
    /* Body */
    const body = <Types.ZabbixPost>{
      jsonrpc: "2.0",
      method: "event.acknowledge",
      params: params,
      id: 1,
    };

    /* Post */
    const response =
      await this.ZabbixPost<Types.ZabbixResponseEventAcknowledge>(body);
    return response;
  }
}
