import { Toast } from "@raycast/api";
import fetch from "node-fetch";
import { GetApiEndpoint } from "../../type/config";
import { TalkQuestionFileType, TalkType } from "../../type/talk";

export async function RunCustomApi(
  chat: TalkType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<TalkType | undefined> {
  // eslint-disable-next-line
  const fs = require("fs");
  const newChat: TalkType = JSON.parse(JSON.stringify(chat));

  if (newChat.question.files !== undefined) {
    newChat.question.files.forEach((f: TalkQuestionFileType) => {
      f.type = "image";
      f.base64 = fs.readFileSync(f.path, { encoding: "base64" });
    });
  }

  return await fetch(GetApiEndpoint().host, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.assign({ dataType: "talk" }, newChat)),
  })
    .then(async (response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .then(async (res: any) => {
      if (chat.result === undefined) {
        chat.result = {
          text: "",
          imageExist: false,
          images: undefined,
          actionType: "",
          actionName: "",
          actionStatus: "",
        };
      }
      chat = { ...chat, result: res.result };

      if (typeof chat.result?.text === "string") {
        interaction.setLoading(false);

        interaction.toast.title = "Got your answer!";
        interaction.toast.style = Toast.Style.Success;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        interaction.setData((prev: any) => {
          return prev.map((a: TalkType) => {
            if (a.chatId === chat.chatId) {
              return chat;
            }
            return a;
          });
        });
      }

      return chat;
    })
    .catch((error) => {
      console.log(error);

      interaction.toast.title = "Error";
      interaction.toast.message = String(error);
      interaction.toast.style = Toast.Style.Failure;

      interaction.setLoading(false);

      return undefined;
    });
}
