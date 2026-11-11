import { environment, OAuth } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { LeafClient, LeafError, pipePath, type SendHello } from "./rpc";

// Raycast's Sign-In Screen: its button opens Leaf Calendar's connect link, which shows the Allow window
const signIn = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "Leaf Calendar",
  providerIcon: "extension-icon.png",
  providerId: "leaf-calendar",
  description: "Leaf Calendar asks you to allow Raycast to connect.",
});

let client: LeafClient | undefined;

/** The command's connection to Leaf Calendar, made on first use. */
export function leaf(): LeafClient {
  if (!client) {
    client = new LeafClient({ path: pipePath(os.userInfo().username), hello });
  }

  return client;
}

/**
 * Says hello to Leaf Calendar with an `askOnLink` code. Allowed already: done. Not yet: Leaf Calendar answers
 * `approval_needed` and Raycast's sign-in screen shows; its button opens `leaf-calendar://connect?code=…`, which shows the
 * Allow window. The return link is the sign-in screen's own redirect, so Allow lands on "signed in" and back in the
 * command, with no "triggered outside of Raycast" prompt. The connection stays open, so the next hello is answered as
 * an allowed app's.
 */
async function hello(send: SendHello): Promise<unknown> {
  const params = {
    client: "Raycast",
    icon: readFileSync(path.join(environment.assetsPath, "hello-icon.png")).toString("base64"),
  };
  const code = randomBytes(16).toString("hex");
  const request = await signIn.authorizationRequest({
    endpoint: "leaf-calendar://connect",
    clientId: "raycast",
    scope: "",
  });
  const redirect = new URL(request.redirectURI);
  redirect.searchParams.set("code", "allowed");
  redirect.searchParams.set("state", request.state);

  // Allowed Already
  try {
    return await send({ ...params, returnUrl: redirect.toString(), askOnLink: code });
  } catch (error) {
    if (!(error instanceof LeafError && error.code === "approval_needed")) {
      throw error;
    }
  }

  // Not Yet: The Sign-In Screen, Then Allow. Closing The Screen Counts As Not Allowed
  try {
    await signIn.authorize({ url: `leaf-calendar://connect?code=${code}` });
  } catch {
    throw new LeafError("not_approved", "The sign-in was closed before Leaf Calendar allowed Raycast.");
  }

  return send(params);
}

// What To Tell The Person For Each Error Code
const ERRORS: Record<string, { title: string; message: string }> = {
  not_running: {
    title: "Leaf Calendar isn't reachable",
    message: "Open Leaf Calendar, then turn on Settings › Connected apps › Allow other apps to connect.",
  },
  not_approved: {
    title: "Raycast isn't allowed to connect",
    message: "Choose Allow when Leaf Calendar asks. If you chose Don't allow, restart Leaf Calendar to be asked again.",
  },
  not_signed_in: { title: "No Google account", message: "Sign in to Google in Leaf Calendar first." },
  not_connected: { title: "No scheduling provider", message: "Connect Cal.com in Leaf Calendar's settings first." },
  no_meeting: { title: "No meeting to join", message: "Nothing coming up has a meeting link." },
  read_only: { title: "Can't change that", message: "You don't have permission to edit it." },
  not_found: { title: "Not found", message: "It may have moved or been deleted. Refresh and try again." },
  unavailable: { title: "Cal.com couldn't be reached", message: "Try again later." },
  timeout: { title: "Leaf Calendar didn't answer", message: "Make sure Leaf Calendar is running, then try again." },
  disconnected: { title: "Lost the connection to Leaf Calendar", message: "Try again." },
};

/** A title and message for an error, friendly for Leaf Calendar's codes. */
export function describeError(error: unknown): { title: string; message: string } {
  if (error instanceof LeafError && ERRORS[error.code]) {
    return ERRORS[error.code];
  }

  return { title: "Something went wrong", message: error instanceof Error ? error.message : String(error) };
}

export async function showLeafError(error: unknown): Promise<void> {
  await showFailureToast(error, describeError(error));
}
