import { open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { rpc, managerReceipt, type Session } from "./helper";
import { managerAvailability, managerNotice, type ManagerTarget } from "./helpers/manager";

export const ME_INSTALL_URL = "https://github.com/Schnee013/mark-everything/blob/main/docs/INSTALL.md";

export async function failure(e: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title: "ME needs attention",
    message: String(e),
    primaryAction: {
      title: "Open Preferences",
      onAction: openExtensionPreferences,
    },
    secondaryAction: {
      title: "ME Installation Guide",
      onAction: () => open(ME_INSTALL_URL),
    },
  });
}
export async function manager(s: Session, id?: string, conflicts = false) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening ME Manager",
  });
  try {
    // Report an unsupported browser before the helper creates a request and
    // launches anything; `launch: false` only describes the bound target.
    const probe = await rpc<"openManager">(
      s.installation,
      "openManager",
      { id, conflicts, launch: false },
      s.libraryId,
    );
    const target = (probe as { target?: ManagerTarget }).target;
    const availability = managerAvailability(target);
    if (availability !== "ready") {
      const notice = managerNotice(availability, target?.browser);
      toast.style = Toast.Style.Failure;
      toast.title = notice.title;
      toast.message = notice.message;
      return;
    }
    const raw = await rpc<"openManager">(
      s.installation,
      "openManager",
      { id, conflicts, launch: true },
      s.libraryId,
      { timeoutMs: 15000 },
    );
    const receipt = managerReceipt(raw, s.libraryId, !!id);
    const update = (opened: boolean) => {
      if (opened) {
        toast.style = Toast.Style.Success;
        toast.title = "Opened in ME";
        toast.message = undefined;
        toast.primaryAction = undefined;
        return;
      }
      toast.style = Toast.Style.Failure;
      toast.title = "ME Manager has not connected";
      toast.message = "Load ME in its registered browser profile, then check again.";
      toast.primaryAction = {
        title: "Check Again",
        onAction: async () => {
          try {
            const result = managerReceipt(
              await rpc(s.installation, "managerStatus", { requestId: receipt.requestId }, s.libraryId),
              s.libraryId,
              !!id,
            );
            update(result.opened);
          } catch (e) {
            await failure(e);
          }
        },
      };
    };
    update(receipt.opened);
  } catch (e) {
    await toast.hide();
    throw e;
  }
}
