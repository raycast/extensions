import { showToast, showHUD, Clipboard, LocalStorage } from "@raycast/api";
import { client, refreshTokens } from "./vk-oauth";
import fetch from "node-fetch";

interface VKErrorResponse {
  error: {
    error_code: number;
    error_msg: string;
    error_subcode?: number;
  };
}

async function createCall(
  userId: string,
  accessToken: string,
  title: string,
): Promise<{ response: CallsStartResponse }> {
  const callUrl = new URL("https://api.vk.com/method/calls.start");
  callUrl.searchParams.set("user_id", userId.toString());
  callUrl.searchParams.set("v", "5.131");
  callUrl.searchParams.set("access_token", accessToken);
  callUrl.searchParams.set("name", title);

  const response = await fetch(callUrl);
  const data = await response.json();

  // Проверяем на ошибку токена
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = data as VKErrorResponse;
    console.log(error);
    if (error.error.error_code === 5 && error.error.error_subcode === 1130) {
      // Обновляем токен
      const newTokens = await refreshTokens();
      console.log(newTokens);
      await client.setTokens(newTokens);

      // Повторяем запрос с новым токеном
      return createCall(userId, newTokens.accessToken, title);
    }
    throw new Error(error.error.error_msg);
  }

  return data as { response: CallsStartResponse };
}

export default async function Command(props: { arguments: { title: string } }) {
  const title = props.arguments.title || "Новый звонок";
  showToast({ title: "Создание звонка", message: `Создаем звонок в vk calls с названием "${title}"` });

  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    return showHUD("Не авторизован");
  }

  const userId = await LocalStorage.getItem("vk_user_id");
  console.log(userId);
  if (!userId) {
    return showHUD("ID пользователя не найден");
  }

  try {
    const data = await createCall(userId.toString(), tokenSet.accessToken, title);
    console.log(data);
    Clipboard.copy(data.response.join_link);
    showHUD("Ссылка на звонок скопирована в буфер обмена");
  } catch (error) {
    console.error(error);
    showHUD(error instanceof Error ? error.message : "Ошибка при создании звонка");
  }
}

export interface CallsStartResponse {
  /**
   * Call id
   */
  call_id?: string;
  /**
   * Join link
   */
  join_link: string;
  /**
   * OK join link
   */
  ok_join_link: string;
  /**
   * video id for link
   */
  broadcast_video_id?: string;
  /**
   * video id for streaming
   */
  broadcast_ov_id?: string;
  short_credentials?: CallsShortCredentials;
}
export interface CallsShortCredentials {
  /**
   * Short numeric ID of a call
   */
  id: string;
  /**
   * Password that can be used to join a call by short numeric ID
   */
  password: string;
  /**
   * Link without a password
   */
  link_without_password: string;
  /**
   * Link with a password
   */
  link_with_password: string;
}
