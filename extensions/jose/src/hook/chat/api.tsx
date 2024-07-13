import { Toast } from "@raycast/api";
import fetch from "node-fetch";
import { GetApiEndpoint } from "../../type/config";
import { initData, ITalk, ITalkDataResult, ITalkQuestionFile, newTalkDataResult } from "../../ai/type";

export async function RunCustomApi(
  chatData: ITalk,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<ITalk | undefined> {
  chatData = initData(chatData);
  chatData.llm.stream = true;

  // eslint-disable-next-line
  const fs = require("fs");
  const newChat: ITalk = JSON.parse(JSON.stringify(chatData));

  if (newChat.conversation.question.files !== undefined) {
    newChat.conversation.question.files.forEach((f: ITalkQuestionFile) => {
      f.type = "image";
      f.base64 = fs.readFileSync(f.path, { encoding: "base64" });
    });
  }

  if (!chatData.llm.stream) {
    return await fetch(GetApiEndpoint().host, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.assign({ dataType: "talk" }, newChat)),
    })
      .then(async (response) => response.json())
      .then(async (res: ITalkDataResult) => {
        if (chatData.result === undefined) {
          chatData.result = newTalkDataResult();
        }
        chatData = { ...chatData, result: res };

        if (typeof chatData.result?.content === "string") {
          interaction.setLoading(false);

          interaction.toast.title = "Got your answer!";
          interaction.toast.style = Toast.Style.Success;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          interaction.setData((prev: any) => {
            return prev.map((a: ITalk) => {
              if (a.id === chatData.id) {
                return chatData;
              }
              return a;
            });
          });
        }

        return chatData;
      })
      .catch((error) => {
        console.error(error);

        interaction.toast.title = "Error";
        interaction.toast.message = String(error);
        interaction.toast.style = Toast.Style.Failure;

        interaction.setLoading(false);

        return undefined;
      });
  } else {
    return await fetch(GetApiEndpoint().host, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.assign({ dataType: "talk" }, newChat)),
    })
      .then(async (response) => {
        for await (const chunkByte of response.body) {
          const chunks = chunkByte.toString().split("\n");

          for await (const chunkString of chunks) {
            if (chunkString === "") continue;
            const r: ITalkDataResult = JSON.parse(chunkString);

            if (r.finish) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              interaction.setData((prev: any) => {
                return prev.map((a: ITalk) => {
                  if (a.id === chatData.id) {
                    return chatData;
                  }
                  return a;
                });
              });

              setTimeout(async () => {
                interaction.setStreamData(undefined);
              }, 5);

              interaction.setLoading(false);

              interaction.toast.title = "Got your answer!";
              interaction.toast.style = Toast.Style.Success;
              return;
            }
            if (chatData.result === undefined) {
              chatData.result = newTalkDataResult();
            }
            chatData.result.content += r.content;

            interaction.setStreamData({ ...chatData });
          }
        }
        return chatData;
      })
      .catch((error) => {
        console.error(error);

        interaction.toast.title = "Error";
        interaction.toast.message = String(error);
        interaction.toast.style = Toast.Style.Failure;

        interaction.setLoading(false);

        return undefined;
      });
  }
}
