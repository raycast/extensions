import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Receipt } from "./contract";
import {
  openWithVerificationFailure,
  receiptReasonMessage,
  safeMessage,
  VerificationFailureHandler,
} from "./errors";
import { openHarborDrop } from "./app";
import { PendingRequest, pollReceipt, terminal, wakeURL } from "./transport";
import { forgetPending } from "./pending";

export async function showFailure(error: unknown): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "HarborDrop",
    message: safeMessage(error),
  });
}
export function OpenAppAction({
  onVerificationFailure,
}: {
  onVerificationFailure: VerificationFailureHandler;
}) {
  return (
    <Action
      title="Open HarborDrop"
      icon={Icon.AppWindow}
      onAction={() =>
        openWithVerificationFailure(
          () => openHarborDrop(),
          onVerificationFailure,
        ).catch(showFailure)
      }
    />
  );
}

const RECEIPT_TEXT: Record<Receipt["status"], string> = {
  accepted:
    "HarborDrop received the request. It has not approved or started a download.",
  awaitingUser: "Review and confirm this request in HarborDrop.",
  executing: "HarborDrop is handling this request.",
  succeeded:
    "HarborDrop handled the request. Adding a task does not mean its download is complete.",
  rejected:
    "HarborDrop declined the request. Open the app to check its current state.",
  expired:
    "The request expired before it could run. Check HarborDrop before sending a new request.",
  cancelled: "The request was cancelled in HarborDrop.",
  failed:
    "HarborDrop could not complete the request. Open the app for details.",
  reconciliationRequired:
    "HarborDrop needs to reconcile this request. Do not resend it; open the app to check its state.",
};

export function RequestStatus({
  pending,
  onVerificationFailure,
}: {
  pending: PendingRequest;
  onVerificationFailure: VerificationFailureHandler;
}) {
  const [receipt, setReceipt] = useState<Receipt>();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();
  const [timedOut, setTimedOut] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const current = useRef(pending);
  const check = useCallback(async () => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setChecking(true);
    setError(undefined);
    setTimedOut(false);
    try {
      const result = await pollReceipt(current.current, {
        signal: active.signal,
        onReceipt: (value) => {
          if (active.signal.aborted) return;
          current.current = {
            ...current.current,
            payloadHash: value.payloadHash,
            receiptRevision: value.receiptRevision,
          };
          setReceipt(value);
        },
      });
      if (!active.signal.aborted) setTimedOut(result.timedOut);
      if (
        !active.signal.aborted &&
        result.receipt &&
        terminal(result.receipt) &&
        result.receipt.status !== "reconciliationRequired"
      )
        await forgetPending(pending);
    } catch (value) {
      if (!active.signal.aborted) setError(safeMessage(value));
    } finally {
      if (!active.signal.aborted) setChecking(false);
    }
  }, [pending]);
  useEffect(() => {
    void check();
    return () => controller.current?.abort();
  }, [check]);
  const text =
    error ??
    (receipt
      ? RECEIPT_TEXT[receipt.status]
      : "The result is not confirmed. Open HarborDrop and check the same request.");
  const reason = receiptReasonMessage(receipt?.reasonCode);
  return (
    <Detail
      isLoading={checking}
      markdown={`# ${timedOut ? "Result Not Confirmed" : "HarborDrop Request"}\n\n${text}${reason ? `\n\n${reason}` : ""}\n\n${timedOut ? "Checking timed out. The request may still be pending in HarborDrop. It will not be resent automatically.\n\n" : ""}Request ID: \`${pending.requestID}\`\n\nYou can close this view without cancelling the app's request.`}
      actions={
        <ActionPanel>
          <Action
            title="Check in HarborDrop"
            icon={Icon.AppWindow}
            onAction={() =>
              openWithVerificationFailure(
                () => openHarborDrop(wakeURL(pending.requestID)),
                onVerificationFailure,
              ).catch(showFailure)
            }
          />
          <OpenAppAction onVerificationFailure={onVerificationFailure} />
          <Action
            title="Check Same Request"
            icon={Icon.ArrowClockwise}
            onAction={check}
          />
        </ActionPanel>
      }
    />
  );
}
