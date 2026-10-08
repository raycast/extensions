import { environment, getApplications, LaunchProps, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Connection, getStatus, saveConnection } from "./api/client";
import { AKTAR_DOWNLOAD_URL, isAktar, showAktarFailure } from "./lib/errors";

type LaunchContext = {
  /** Sent back by Aktar through a deeplink once the user approves the connection. */
  aktar?: Partial<Connection>;
};

const PENDING_PAIRING_KEY = "pending-pairing";
/** How long an approval in Aktar is accepted after Connect to Aktar was run. */
const PAIRING_TIMEOUT_MS = 5 * 60 * 1000;

type PendingPairing = {
  nonce: string;
  startedAt: number;
};

/**
 * Pairing is a round trip: this command opens aktar://connect with a
 * deeplink back to itself, Aktar asks the user to approve, then reopens
 * this command with the port and token as launch context.
 *
 * Anything can open a Raycast deeplink, so a handed-over connection is only
 * accepted when it answers a request started here: the deeplink carries a
 * one-time nonce (as fallbackText, which Aktar passes through untouched)
 * that must match the pending request, and the other end must then
 * identify itself as Aktar before anything is saved.
 */
export default async function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const handedOver = props.launchContext?.aktar;
  if (handedOver) {
    await finishPairing(handedOver, props.fallbackText);
    return;
  }

  const applications = await getApplications();
  if (!applications.some(isAktar)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Aktar isn't installed",
      message: "Install the Aktar app first.",
      primaryAction: { title: "Download Aktar", onAction: () => open(AKTAR_DOWNLOAD_URL) },
    });
    return;
  }

  const pending: PendingPairing = { nonce: randomBytes(24).toString("hex"), startedAt: Date.now() };
  await LocalStorage.setItem(PENDING_PAIRING_KEY, JSON.stringify(pending));

  const callback = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${environment.commandName}?fallbackText=${pending.nonce}`;
  await open(`aktar://connect?callback=${encodeURIComponent(callback)}`);
  await showHUD("Approve the connection in Aktar");
}

async function finishPairing(handedOver: Partial<Connection>, nonce: string | undefined) {
  // Checked before any request is made, so a forged deeplink can't even
  // make the extension contact a port of its choosing.
  if (!(await consumePendingPairing(nonce))) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Connection request not recognized",
      message: "Run Connect to Aktar from Raycast to pair with Aktar.",
    });
    return;
  }

  const { port, token } = handedOver;
  if (
    typeof token !== "string" ||
    !token ||
    typeof port !== "number" ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535
  ) {
    await showToast({ style: Toast.Style.Failure, title: "Aktar sent an invalid connection" });
    return;
  }
  const connection: Connection = { port, token };

  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Aktar" });
  // Aktar may still be starting its local API right after the approval.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const status = await getStatus(connection);
      if (status.app !== "Aktar" || typeof status.apiVersion !== "number") {
        toast.style = Toast.Style.Failure;
        toast.title = "That isn't Aktar";
        toast.message = "The app on the other end didn't identify itself as Aktar.";
        return;
      }
      await saveConnection(connection);
      toast.style = Toast.Style.Success;
      toast.title = "Connected to Aktar";
      toast.message = `Aktar ${status.version}`;
      return;
    } catch (error) {
      if (attempt === 9) {
        await showAktarFailure(error, "Couldn't connect to Aktar");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

/**
 * True when `nonce` matches the pairing started here and it hasn't expired.
 * A match uses the request up; a mismatch leaves it alone, so a forged
 * deeplink can't cancel a pairing the user is in the middle of.
 */
async function consumePendingPairing(nonce: string | undefined) {
  const stored = await LocalStorage.getItem<string>(PENDING_PAIRING_KEY);
  if (!stored || !nonce) return false;
  let pending: PendingPairing;
  try {
    pending = JSON.parse(stored) as PendingPairing;
  } catch {
    await LocalStorage.removeItem(PENDING_PAIRING_KEY);
    return false;
  }
  if (Date.now() - pending.startedAt > PAIRING_TIMEOUT_MS) {
    await LocalStorage.removeItem(PENDING_PAIRING_KEY);
    return false;
  }
  const expected = Buffer.from(pending.nonce);
  const received = Buffer.from(nonce);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
  await LocalStorage.removeItem(PENDING_PAIRING_KEY);
  return true;
}
