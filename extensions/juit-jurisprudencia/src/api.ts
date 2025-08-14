import fetch from "node-fetch";
import { JUITApiResponse, SearchParams, ApiError } from "./types";

const API_BASE_URL = "https://api.juit.io:8080/v1/data-products/search";

export class JUITApiClient {
  private username: string;
  private password: string;
  private owner: string;

  constructor(username: string, password: string, owner: string) {
    this.username = username;
    this.password = password;
    this.owner = owner;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString("base64");
    return `Basic ${credentials}`;
  }

  private buildQueryParams(params: SearchParams): URLSearchParams {
    const searchParams = new URLSearchParams();

    // Required parameters
    searchParams.append("query", params.query);
    searchParams.append("owner", params.owner);

    // Search fields (required)
    params.search_on.forEach((field) => {
      searchParams.append("search_on", field);
    });

    // Optional parameters
    if (params.search_id) {
      searchParams.append("search_id", params.search_id);
    }

    if (params.next_page_token) {
      searchParams.append("next_page_token", params.next_page_token);
    }

    // Sort parameters
    if (params.sort_by_field) {
      params.sort_by_field.forEach((field) => {
        searchParams.append("sort_by_field", field);
      });
    } else {
      // Default sort
      searchParams.append("sort_by_field", "score");
      searchParams.append("sort_by_field", "juit_id");
    }

    if (params.sort_by_direction) {
      params.sort_by_direction.forEach((direction) => {
        searchParams.append("sort_by_direction", direction);
      });
    } else {
      // Default direction
      searchParams.append("sort_by_direction", "desc");
      searchParams.append("sort_by_direction", "desc");
    }

    // Filters
    if (params.court_code) {
      params.court_code.forEach((court) => {
        searchParams.append("court_code", court);
      });
    }

    if (params.degree) {
      params.degree.forEach((degree) => {
        searchParams.append("degree", degree);
      });
    }

    if (params.trier) {
      params.trier.forEach((trier) => {
        searchParams.append("trier", trier);
      });
    }

    if (params.order_date) {
      params.order_date.forEach((date) => {
        searchParams.append("order_date", date);
      });
    }

    if (params.disable_synonym_on) {
      params.disable_synonym_on.forEach((field) => {
        searchParams.append("disable_synonym_on", field);
      });
    }

    return searchParams;
  }

  async searchJurisprudence(params: SearchParams): Promise<JUITApiResponse> {
    const queryParams = this.buildQueryParams({
      ...params,
      owner: this.owner,
    });

    const url = `${API_BASE_URL}/jurisprudence?${queryParams.toString()}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json; charset=utf-8",
          "Accept-Language": "pt-br",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json; charset=utf-8",
          Authorization: this.getAuthHeader(),
          "User-Agent": "JUIT-Raycast-Extension/1.0.0",
        },
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiError;
        throw new Error(`API Error ${response.status}: ${errorData.message}`);
      }

      const data = (await response.json()) as JUITApiResponse;
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Erro ao buscar jurisprudência: ${error.message}`);
      }
      throw new Error("Erro desconhecido ao buscar jurisprudência");
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Test with a simple query
      await this.searchJurisprudence({
        query: "teste",
        owner: this.owner,
        search_on: ["headnote"],
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}
