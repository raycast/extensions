import { act } from "../lib/client";

export default async function tool() {
  await act({ cmd: "resume" });
  return "TalkRemind resumed.";
}
