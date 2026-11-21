import { showToast, Toast, type Image } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import type { SendContent } from "../lib/content";
import type { QuickSendSetupContext } from "../lib/quick-send";
import { NothingToSend } from "./NothingToSend";
import { RecipientList } from "./RecipientList";

/**
 * A command that sends one source (the clipboard or the selection): read it, then pick a recipient.
 * The recipient list is shown right away, so typing starts immediately; it contacts Blip once the
 * content is known. If the source is empty, the alternatives are offered instead.
 */
export function SendSource({
  read,
  empty,
  launchContext,
}: {
  read: () => Promise<SendContent | undefined>;
  empty: { icon: Image.ImageLike; title: string; failedTitle: string; description: string; prefer: "text" | "files" };
  launchContext?: QuickSendSetupContext;
}) {
  const {
    data: content,
    isLoading,
    error,
    revalidate,
  } = usePromise(read, [], {
    onError: () => {}, // Shown in the empty view instead of a toast.
  });
  const rememberForQuickSend = launchContext?.setupQuickSend;

  useEffect(() => {
    if (launchContext?.missingRecipient) {
      showToast({
        style: Toast.Style.Failure,
        title: `${launchContext.missingRecipient} Is No Longer Available`,
        message: "Choose a new Quick Send recipient.",
      });
    }
  }, []);

  if (!isLoading && !content) {
    return (
      <NothingToSend
        icon={empty.icon}
        title={error ? empty.failedTitle : empty.title}
        description={error ? error.message : empty.description}
        prefer={empty.prefer}
        onRetry={revalidate}
        rememberForQuickSend={rememberForQuickSend}
      />
    );
  }
  return <RecipientList content={content} rememberForQuickSend={rememberForQuickSend} />;
}
