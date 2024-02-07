import { useState } from "react";

import { IRequest, IResponse } from "@/interfaces/http";
import { useFetch } from "@raycast/utils";

import { BASE_URL, ERROR_MAP } from "./constants";
import preference from "./preference";

export default function HTTPRequest(request: IRequest) {
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorContent, setErrorContent] = useState("");

  const url = `${BASE_URL}${request.url}`;

  const { data, isLoading } = useFetch<IResponse>(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": preference.apiKey,
    },
    onError: (err: Error) => {
      const error = ERROR_MAP(err);
      setErrorTitle(error.title);
      setErrorMessage(error.message);
      setErrorContent(error.content);
    },
  });

  return { data, isLoading, error: { title: errorTitle, message: errorMessage, markdown: errorContent } };
}
