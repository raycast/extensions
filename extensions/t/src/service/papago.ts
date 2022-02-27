import fetch from "node-fetch";
import { base64 } from "../util/base64";
import { TranslateListItemData, TranslateOption } from "./type";
import { LocalStorage } from "@raycast/api";
import { URLSearchParams } from "url";
import { Messanger } from "../context/MessageContext";
import { Message } from "../message";

export const search = async (options: TranslateOption, m: Messanger): Promise<string> => {
  const { source, target, text } = options;
  const url = "https://openapi.naver.com/v1/papago/n2mt";
  const form = new URLSearchParams();
  const xNaverClientId = (await LocalStorage.getItem<string>(PapagoKey["X-Naver-Client-Id"])) ?? "";
  const xNaverClientSecret = (await LocalStorage.getItem<string>(PapagoKey["X-Naver-Client-Secret"])) ?? "";

  if (!xNaverClientId) {
    throw new Error(m((l) => l.disabled));
  }
  if (!xNaverClientSecret) {
    throw new Error(m((l) => l.disabled));
  }
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    [PapagoKey["X-Naver-Client-Id"]]: xNaverClientId,
    [PapagoKey["X-Naver-Client-Secret"]]: xNaverClientSecret,
  };

  form.append("source", source);
  form.append("target", target);
  form.append("text", text);

  return fetch(url, {
    headers,
    method: "post",
    body: form,
  })
    .then((response) => response.json() as Promise<Response>)
    .then((response) => {
      if ("errorCode" in response) {
        if (response.errorCode === ErrorCode.AuthorizationError) {
          throw new Error(`${m(l => l.setting)} -> ${Object.values(PapagoKey).join(", ")}`);
        }
        throw new Error(`[${response.errorCode}] ${response.errorMessage}`);
      }
      return response;
    })
    .then((response) => response.message.result.translatedText);
};
export const createListItem = (text: string): TranslateListItemData => {
  return {
    text,
    service: "파파고",
    key: base64(text) || id,
    icon: ICON,
  };
};
export const id = "papago";
export const getSiteTranslationUrl = (options: TranslateOption, url: string) => {
  const params = new URLSearchParams();
  params.append("source", options.source);
  params.append("locale", options.target);
  params.append("target", options.target);
  params.append("url", url);

  return `https://papago.naver.net/website${params.toString()}`;
};

const ICON = "https://papago.naver.com/static/img/icon_72x72.png";

enum PapagoKey {
  "X-Naver-Client-Id" = "X-Naver-Client-Id",
  "X-Naver-Client-Secret" = "X-Naver-Client-Secret",
}

enum ErrorCode {
  AuthorizationError = "024",
}

type Response =
  | {
      message: {
        result: {
          translatedText: string;
        };
      };
    }
  | ErrorResponse;
type ErrorResponse = {
  errorCode: string;
  errorMessage: string;
};
