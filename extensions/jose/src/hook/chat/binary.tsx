import { Toast } from "@raycast/api";
import { GetApiBinnaryPath } from "../../type/config";
import { TalkQuestionFileType, TalkType } from "../../type/talk";

export async function RunBinnary(
  chat: TalkType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<TalkType | undefined> {
  // eslint-disable-next-line
  const util = require("util");
  // eslint-disable-next-line
  const fs = require("fs");
  // eslint-disable-next-line
  const exec = util.promisify(require("child_process").exec);
  const newChat: TalkType = JSON.parse(JSON.stringify(chat));

  if (newChat.question.files !== undefined) {
    newChat.question.files.forEach((f: TalkQuestionFileType) => {
      f.type = "image";
      f.base64 = fs.readFileSync(f.path, { encoding: "base64" });
    });
  }
  const b64 = Buffer.from(JSON.stringify(newChat)).toString("base64");

  try {
    const { stdout, stderr } = await exec(`chmod +x ${GetApiBinnaryPath()}; .${GetApiBinnaryPath()} '${b64}'`);

    if (stderr !== "") {
      console.log(stderr);

      interaction.toast.title = "Error";
      interaction.toast.message = String(stderr);
      interaction.toast.style = Toast.Style.Failure;

      interaction.setLoading(false);

      return undefined;
    }

    const out: TalkType = JSON.parse(stdout);
    chat = { ...chat, result: out.result ?? undefined };

    if (typeof chat.result?.text === "string") {
      interaction.setLoading(false);

      interaction.toast.title = "Got your answer!";
      interaction.toast.style = Toast.Style.Success;

      interaction.setData((prev: TalkType[]) => {
        return prev.map((a: TalkType) => {
          if (a.chatId === chat.chatId) {
            return chat;
          }
          return a;
        });
      });
    }

    return chat;
  } catch (error) {
    console.log(error);

    interaction.toast.title = "Error";
    interaction.toast.message = String(error);
    interaction.toast.style = Toast.Style.Failure;

    interaction.setLoading(false);

    return undefined;
  }
}
