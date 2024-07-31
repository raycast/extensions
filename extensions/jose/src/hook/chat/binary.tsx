import { Toast } from "@raycast/api";
import { GetApiBinnary } from "../../type/config";
import { ITalk, ITalkQuestionFile } from "../../ai/type";

export async function RunBinnary(
  chat: ITalk,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interaction: { toast: Toast; setData: any; setStreamData: any; setLoading: any }
): Promise<ITalk | undefined> {
  // eslint-disable-next-line
  const util = require("util");
  // eslint-disable-next-line
  const fs = require("fs");
  // eslint-disable-next-line
  const exec = util.promisify(require("child_process").exec);
  const newChat: ITalk = JSON.parse(JSON.stringify(chat));

  if (newChat.conversation.question.files !== undefined) {
    newChat.conversation.question.files.forEach((f: ITalkQuestionFile) => {
      f.type = "image";
      f.base64 = fs.readFileSync(f.path, { encoding: "base64" });
    });
  }
  const b64 = Buffer.from(JSON.stringify(newChat)).toString("base64");

  // eslint-disable-next-line no-useless-catch
  try {
    const { stdout, stderr } = await exec(`chmod +x ${GetApiBinnary().path}; .${GetApiBinnary().path} '${b64}'`);

    if (stderr !== "") {
      throw stderr;
    }

    const out: ITalk = JSON.parse(stdout);
    chat = { ...chat, result: out.result ?? undefined };

    if (typeof chat.result?.content === "string") {
      interaction.setLoading(false);

      interaction.toast.title = "Got your answer!";
      interaction.toast.style = Toast.Style.Success;

      interaction.setData((prev: ITalk[]) => {
        return prev.map((a: ITalk) => {
          if (a.id === chat.id) {
            return chat;
          }
          return a;
        });
      });
    }

    return chat;
  } catch (error) {
    throw error;
  }
}
