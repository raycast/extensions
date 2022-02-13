import { ActionPanel, getPreferenceValues, List, showToast, Toast, Action } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import qs from "qs";
import React, { useEffect, useState } from "react";

interface Preferences {
  clientId: string;
  clientSecret: string;
}

interface DetectLangsResponse {
  langCode: string;
}

interface N2MTResponse {
  message: {
    result: {
      srcLangType: string;
      tarLangType: string;
      translatedText: string;
    };
  };
}

function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    if (query === "") {
      return;
    }
    setIsLoading(true);
    setResult("");
    const preferences = getPreferenceValues<Preferences>();

    const instance = axios.create({
      baseURL: "https://openapi.naver.com/v1/papago",
      headers: {
        "X-Naver-Client-Id": preferences.clientId,
        "X-Naver-Client-Secret": preferences.clientSecret,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    instance
      .post("/detectLangs", qs.stringify({ query: query }))
      .then((res) => {
        const source = res.data.langCode;
        const target = source == "ko" ? "en" : "ko";
        instance
          .post(
            "/n2mt",
            qs.stringify({
              text: query,
              source,
              target,
            })
          )
          .then((res) => {
            setResult(res.data.message.result.translatedText);
          })
          .catch((errors) => {
            showToast(Toast.Style.Failure, "Could not translate", errors);
          })
          .then(() => {
            setIsLoading(false);
          });
      })
      .catch((errors) => {
        showToast(Toast.Style.Failure, "Could not detect the language", errors);
      })
      .then(() => {
        setIsLoading(false);
      });
  }, [query]);
  return (
    <List
      searchBarPlaceholder="Input a sentence to translate"
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      throttle
    >
      <List.Item
        title={result || "No Result"}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy" content={result} />
            <Action.OpenInBrowser title="Open in Browser" url={`https://papago.naver.com/?&st=${query}`} />
          </ActionPanel>
        }
      />
    </List>
  );
}

export default Command;
