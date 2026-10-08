import { useEffect, useState } from "react";
import {
  List,
  showToast,
  Toast,
  Icon,
  ActionPanel,
  Action,
  launchCommand,
  LaunchType,
  LocalStorage,
} from "@raycast/api";
import { KeyRequestData, PollRequestData } from "./types";
import fetch from "node-fetch";

export default function Command() {
  const [token, setToken] = useState<string | undefined>();
  const [complete, setComplete] = useState<boolean>(false);
  const [signInError, setSignInError] = useState<boolean>(false);

  async function createSigner() {
    try {
      const localKey = await LocalStorage.getItem("signerKey");
      if (localKey) {
        setComplete(true);
        return;
      }
      const keyReq = await fetch("https://api.farcasterkeys.com/sign-in", {
        method: "POST",
      });
      const keyRes = (await keyReq.json()) as KeyRequestData;
      if (!keyReq) {
        throw Error("Problem generating key");
      }
      console.log(keyRes);
      setToken(keyRes.pollingToken);
      const pollReq = await fetch(`https://api.farcasterkeys.com/sign-in/poll?token=${keyRes.pollingToken}`);
      const pollRes = (await pollReq.json()) as PollRequestData;
      console.log(pollRes);
      const pollStartTime = Date.now();
      while (pollRes.state != "completed") {
        if (Date.now() - pollStartTime > 120000) {
          await showToast({
            title: "Sign in Timed out",
            style: Toast.Style.Failure,
          });
          setSignInError(true);
          break;
        }
        const pollReq = await fetch(`https://api.farcasterkeys.com/sign-in/poll?token=${keyRes.pollingToken}`);
        const pollRes = (await pollReq.json()) as PollRequestData;
        console.log(pollRes);
        if (pollRes.state === "approved") {
          await LocalStorage.setItem("signerKey", keyRes.privateKey);
          await LocalStorage.setItem("fid", pollRes.userFid!);
          await showToast({
            title: "Sign In Complete!",
          });
          setComplete(true);
          return pollRes;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.log(error);
      await showToast({
        title: "Problem Authorizing",
        message: error as string,
        style: Toast.Style.Failure,
      });
    }
  }

  useEffect(() => {
    createSigner();
  }, []);

  return (
    <List>
      {complete && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Raycaster is authorized! Now you can use Send Cast"
          actions={
            <ActionPanel>
              <Action
                title="Open Send Cast"
                icon={Icon.Wand}
                onAction={async () => {
                  try {
                    launchCommand({ name: "send-cast", type: LaunchType.UserInitiated });
                  } catch {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Something went wrong",
                      message: "Open Send Cast manually",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {!complete && !signInError && token && (
        <List.EmptyView
          icon={{ source: `https://api.farcasterkeys.com/qr/${token}?filename=image.png` }}
          title="Scan the QR code to authorize Raycaster"
        />
      )}
      {!complete && !signInError && !token && (
        <List.EmptyView icon={Icon.BarCode} title="Retreiving the QR code to authorize Raycaster" />
      )}
      {!complete && signInError && <List.EmptyView icon={Icon.XMarkCircle} title="Timed out trying to sign in" />}
    </List>
  );
}
