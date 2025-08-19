/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosResponse } from "axios";
import User from "./user";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import https from "https";
import { LoginResponseDTO } from "../dto/auth.dto";

export interface HttpFunctionResult<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
}

export default class Http {
  static ticketsystemServer: string = "";
  axiosInstance: AxiosInstance = axios.create();

  constructor(public afsPreferences: ExtensionPreferences) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });
    this.axiosInstance.defaults.httpsAgent = httpsAgent;

    this.axiosInstance.defaults.baseURL = afsPreferences.server;
    /**
     * Fügt Interceptor hinzu, der bei einer 401-Antwort versucht, ein neues Access-Token zu erhalten und die Anfrage erneut sendet.
     */
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (err) => {
        if (err.response?.status !== 401 || err.config._retry == true) return Promise.reject(err);

        err.config._retry = true;
        return this.requestNewAccessToken()
          .then(async () => {
            err.config.headers["Authorization"] = `Bearer ${await User.getAccessToken()}`;
            return this.axiosInstance.request(err.config);
          })
          .catch((err) => Promise.reject({ request: err.response }));
      },
    );
  }

  /**
   * Führt eine GET-Anfrage an den angegebenen Endpunkt aus und gibt das Ergebnis zurück.
   * @param route - Der Endpunkt, an den die GET-Anfrage gesendet werden soll.
   * @param query - Eine Liste von Schlüssel-Wert-Paaren, die als Abfrageparameter an die GET-Anfrage angehängt werden sollen.
   * @returns Eine Promise, die das Ergebnis der GET-Anfrage enthält.
   */
  public async GET<T>(
    route: string,
    ...query: { key: string; value: string | number | boolean }[]
  ): Promise<HttpFunctionResult<T>> {
    try {
      const querys: string = query.length > 0 ? query.map((q) => `${q.key}=${q.value}`).join("&") : "";
      const result: AxiosResponse<{ data: T }> = await this.axiosInstance.get(`/api/${route}?${querys}`, {
        headers: {
          Authorization: `Bearer ${await User.getAccessToken()}`,
          "Content-Type": "application/json",
        },
        validateStatus: (status: number) => status >= 200 && status <= 299,
      });
      return this.handleResponse<T>(result);
    } catch (error: any) {
      return this.handleResponse<T>(error.request);
    }
  }

  /**
   * Sendet eine HTTP POST-Anfrage an die angegebene Route mit den angegebenen Daten.
   *
   * @param route - Die Route, an die die Anfrage gesendet werden soll.
   * @param data - Die Daten, die mit der Anfrage gesendet werden sollen.
   * @returns Ein Promise, das ein HttpFunctionResult-Objekt mit dem Ergebnis der Anfrage enthält.
   */
  public async POST<T, D>(route: string, data: D): Promise<HttpFunctionResult<T>> {
    try {
      const result: AxiosResponse<{ data: T }> = await this.axiosInstance.post(`/api/${route}`, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await User.getAccessToken()}`,
        },
        validateStatus: (status: number) => status >= 200 && status <= 299,
      });
      return this.handleResponse<T>(result);
    } catch (error: any) {
      return this.handleResponse<T>(error.request);
    }
  }

  /**
   * Führt eine HTTP PUT-Anfrage aus.
   *
   * @template T - Der erwartete Rückgabetyp der Anfrage.
   * @template D - Der Typ der Daten, die an den Server gesendet werden.
   * @param {string} route - Die Route der Anfrage.
   * @param {D} data - Die Daten, die an den Server gesendet werden.
   * @returns {Promise<T>} - Ein Promise, das den Rückgabewert der Anfrage enthält.
   */
  public async PUT<T, D>(route: string = "", data: D) {
    try {
      const result: AxiosResponse<{ data: T }> = await this.axiosInstance.put(`/api/${route}`, data, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await User.getAccessToken()}`,
        },
        validateStatus: (status: number) => status >= 200 && status <= 299,
      });
      return this.handleResponse<T>(result);
    } catch (error: any) {
      return this.handleResponse<T>(error.request);
    }
  }

  /**
   * Behandelt die HTTP-Antwort und gibt ein HttpFunctionResult-Objekt zurück.
   *
   * @template T - Der Typ der Daten, die in der Antwort enthalten sind.
   * @param response - Die HTTP-Antwort.
   * @returns Das HttpFunctionResult-Objekt, das den Erfolg der Anfrage und die Daten oder Fehlermeldung enthält.
   */
  private handleResponse<T>(response: AxiosResponse): HttpFunctionResult<T> {
    if (response?.status >= 200 && response?.status <= 299) return { success: true, data: response?.data };

    console.error(response);

    let result = null;

    //Fehler behandeln
    //Fehler keine verbindung zum Server
    if (response?.status === 0) result = { success: false, message: `Oops! Can’t connect to the server right now.` };
    //Fehlermeldung von Server behandeln wenn vorhanden
    else
      result = {
        success: false,
        message:
          response?.data?.message || response?.data?.title || response?.statusText || "Whoops! Something went wrong.",
      };

    showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: result.message,
    });
    return result;
  }

  /**
   * Fordert einen neuen Zugriffstoken an.
   *
   * @returns Eine Promise, die den neuen Zugriffstoken als Zeichenkette enthält.
   */
  private async requestNewAccessToken(): Promise<string | undefined> {
    const axiosRefreshInstace = axios.create({
      baseURL: this.afsPreferences.server,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await User.getRefreshToken()) ?? ""}`,
      },
    });

    try {
      const response: AxiosResponse<LoginResponseDTO> = await axiosRefreshInstace.get("/api/auth/renew");
      if (response?.data && response.data.access_token && response.data.refresh_token) {
        LocalStorage.setItem("AFS_ACCESS_TOKEN", response.data.access_token);
        LocalStorage.setItem("AFS_REFRESH_TOKEN", response.data.refresh_token);
        return response.data.access_token;
      } else throw new Error("Failed to request new access token.");
    } catch (error: any) {
      console.error("Error requesting new access token:", error);
      throw new Error("Failed to request new access token.");
    }
  }
}
