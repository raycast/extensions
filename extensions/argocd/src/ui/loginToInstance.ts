/**
 * The one place that decides which login an instance needs.
 *
 * The three modes need three different things, and offering the wrong one does not merely
 * fail: it succeeds at something useless. `argocd login --sso` writes the CLI's config, which
 * the `sso` provider never reads, so the refresh that follows fails again with no way out of
 * the view. A `token` instance has no interactive login at all.
 *
 * This existed inline in the search command, correctly, with a comment saying an earlier
 * version had offered the wrong flow. Then the ApplicationSet view grew its own copy that
 * called `ssoLogin` for every non-token instance, so the bug came back in a second place.
 * Duplicated branching on `authMode` is what allows that, hence one function.
 */

import { Toast, showToast } from "@raycast/api";
import { instanceHost, type ArgoInstance } from "../lib/config/instances";
import { ssoLogin, writeSsoSession } from "./deps";
import { loginWithSso } from "./oidcLogin";

/**
 * Runs the login the instance's mode calls for and reports it in a toast. Resolves true when
 * the caller should refresh, false when nothing was attempted.
 */
export async function loginToInstance(instance: ArgoInstance): Promise<boolean> {
  const host = instanceHost(instance);

  if (instance.authMode === "token") {
    await showToast({
      style: Toast.Style.Failure,
      title: `${host} uses an API token`,
      message: "Set it from Manage Instances; there is no interactive sign-in for this mode.",
    });
    return false;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Signing in to ${host}`,
    message: "Finish the sign-in in your browser.",
  });

  try {
    if (instance.authMode === "sso") {
      const { session } = await loginWithSso(instance);
      await writeSsoSession(instance.id, session);
    } else {
      await ssoLogin(host);
    }
    toast.style = Toast.Style.Success;
    toast.title = `Signed in to ${host}`;
    toast.message = undefined;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Sign-in did not complete";
    toast.message = (error as Error).message;
    return false;
  }
}
