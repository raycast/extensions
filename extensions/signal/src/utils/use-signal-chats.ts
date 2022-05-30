import { useEffect, useState } from "react";
import { SignalChat } from "./types";
import { getStoredSignalChats, saveStoredSignalChats } from "./local-storage";
import osascript from "osascript-tag";
import { showToast, Toast } from "@raycast/api";

export function useSignalChats() {
  const [chats, setChats] = useState<Array<SignalChat>>();
  const [ready, setReady] = useState<boolean>();

  useEffect(() => {
    getStoredSignalChats().then((chats) => {
      setChats(chats);
    });
  }, []);

  const executeJxa = async (script: string) => {
    try {
      const result = await osascript.jxa({ parse: true })`${script}`;
      return result;
    } catch (err: unknown) {
      if (typeof err === "string") {
        const message = err.replace("execution error: Error: ", "");
        console.log(err);
        showToast(Toast.Style.Failure, "Something went wrong", message);
      }
    }
  };

  const openSingal = async () => {
    const result = executeJxa(`
    const app = Application("Signal");
var running = app.running();
if (!running){
   app.activate();
   delay(5);
}
return running;
    `);

    result.then((value) => {
      setReady(value == true);
      return console.log(ready);
    });
  };

  openSingal();

  return {
    chats: chats || [],
    isLoading: chats === undefined || !ready,
    updateChats: async (chats: Array<SignalChat>) => {
      setChats(chats);
      await saveStoredSignalChats(chats);
    },
  };
}
