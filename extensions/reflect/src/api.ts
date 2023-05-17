import fetch from "node-fetch";
import { getTodaysDateAsISOString } from "./utils";

interface ErrorResponse {
  error: {
    type: string;
    message: string;
  };
}

export class ReflectApiError extends Error {
  errorType: string;
  message: string;

  constructor(errorType: string, message: string) {
    super(message);
    this.errorType = errorType;
    this.message = message;
  }
}

// TODO: authorizationToken and graphId are typed as "any"" temporarily because the auto-generated types are not working
export async function appendToDailyNote(authorizationToken: any, graphId: any, text: string, listName?: string) {
  const url = `https://reflect.app/api/graphs/${graphId}/daily-notes`;

  const data = {
    date: getTodaysDateAsISOString(),
    text: text,
    list_name: listName,
    transform_type: "list-append",
  };

  const options = {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authorizationToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorResponse = (await response.json()) as ErrorResponse;
    throw new ReflectApiError(errorResponse.error.type, errorResponse.error.message);
  }
}
