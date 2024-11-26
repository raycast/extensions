import { Color, Icon } from "@raycast/api";
import { randomInt } from "node:crypto";
import { Domain, ErrorResponse } from "./types";

const domainIcon = (domain: Domain) => {
  if (domain.banned || domain.active == false) {
    return { source: Icon.Dot, tintColor: Color.Red };
  } else {
    return { source: Icon.Dot, tintColor: Color.Green };
  }
};

const generatePassword = () => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array(12)
    .fill(chars)
    .map(function (x) {
      return x[randomInt(x.length)];
    })
    .join("");
};

const generateAlias = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Parses the ImprovMX API response.
 *
 * @template T The type of the expected successful response data.
 *
 * @param {Response} response The fetch response object.
 * @param {object} [options={pagination: true}] Options to control the response parsing.
 * @param {boolean} [options.pagination=true] Whether to handle pagination in the response.
 *
 * @returns {Promise<{ data: T; hasMore?: boolean }>} A promise that resolves to an object containing the parsed data and pagination info (if applicable).
 *
 * @throws Will throw an error if the response is not successful, or if there is an issue with the API token.
 */
export async function parseImprovMXResponse<T>(response: Response, options = { pagination: true }) {
  const { pagination } = options;

  type PageMeta = {
    total: number;
    limit: number;
    page: number;
  };
  type SuccessResponse = {
    success: true;
  } & T;

  if (!response.ok) {
    const result = (await response.json()) as ErrorResponse;
    if (result.code === 401) throw new Error("Invalid API Token");

    if ("error" in result) throw new Error(result.error);
    else if ("errors" in result) throw new Error(Object.values(result.errors).flat()[0]);
    throw new Error(
      "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com",
    );
  }
  if (pagination) {
    const result = (await response.json()) as SuccessResponse & PageMeta;
    return {
      data: result,
      hasMore: result.page * result.limit < result.total,
    };
  } else {
    const result = (await response.json()) as SuccessResponse;
    return {
      data: result,
    };
  }
}

export { domainIcon, generatePassword, generateAlias };
