// Uncomment for local testing
// import "../../test/mock-api";

import { $fetch } from "ohmyfetch";

import { getHeader } from "./auth";

const apiVersion = "1.2".replace(".", "_");

export const baseURL = `https://api.quickfile.co.uk/${apiVersion}`;

export const post = <T = unknown>(url: string, body: Record<string, any>) =>
  $fetch<T>(url, {
    baseURL,
    method: "POST",
    body: {
      payload: {
        Header: getHeader(),
        Body: body,
      },
    },
  });

export interface QuickFileResponse<T> {
  Header: {
    MessageType: "Response";
    SubmissionNumber: string;
  };
  Body: T;
}
