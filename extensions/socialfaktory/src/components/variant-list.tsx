import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { firstLine, isFinished, isVariant, platformName, variantSlots, variantText } from "../lib/format";
import {
  pollWriting,
  startWriting,
  type PolledWrite,
  type WriteRecord,
  type WriteRequest,
  type WriteTarget,
} from "../lib/socialfaktory";
import type { Variant } from "../lib/types";
import { SignInAgainAction } from "./sign-in-again";
import { UNREACHABLE_ADVICE, UNREACHABLE_TITLE, failureTitle, requestFrom, retryRequest } from "../lib/writing";

type Props = { request: WriteRequest; record?: undefined } | { record: WriteRecord; request?: undefined };

function initialTarget(record: WriteRecord | undefined): WriteTarget | undefined {
  if (!record?.textGenerationId) return undefined;
  return { brandId: record.brandId, textGenerationId: record.textGenerationId, platform: record.platform };
}

export function VariantList({ request, record }: Props) {
  const pending = useRef<WriteRequest | undefined>(request ?? (record && requestFrom(record)));
  const target = useRef<WriteTarget | undefined>(initialTarget(record));
  const [attempt, setAttempt] = useState(0);
  const latestToast = useRef(0);
  const [generation, setGeneration] = useState<PolledWrite>();
  const [error, setError] = useState<Error>();
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(false);
  const platform = platformName(generation?.platform ?? record?.platform ?? request?.platform ?? "x");

  useEffect(() => {
    const controller = new AbortController();
    const toastNumber = ++latestToast.current;
    const isCheck = Boolean(target.current || record);
    setDone(false);
    setError(undefined);
    setChecking(isCheck);
    const progress = showToast({
      style: Toast.Style.Animated,
      title: target.current ? "Checking on the post" : "Writing post variants",
    });

    (async () => {
      if (!target.current) {
        if (!pending.current) throw new Error("There is no post to check on.");
        target.current = await startWriting(pending.current, controller.signal);
      }
      return pollWriting(target.current, {
        signal: controller.signal,
        onProgress: (next) => {
          if (!controller.signal.aborted) setGeneration(next);
        },
      });
    })()
      .then(async (last) => {
        if (controller.signal.aborted) return;
        setGeneration(last);
        setDone(true);
        const toast = await progress;
        if (last.status === "succeeded") {
          toast.style = Toast.Style.Success;
          toast.title = "Post variants written";
        } else if (last.status === "failed") {
          toast.style = Toast.Style.Failure;
          toast.title = "SocialFaktory could not write this post";
        } else if (last.unreachable) {
          toast.style = Toast.Style.Failure;
          toast.title = UNREACHABLE_TITLE;
          toast.message = UNREACHABLE_ADVICE;
        } else {
          toast.style = Toast.Style.Failure;
          toast.title = "Writing is taking longer than usual";
        }
      })
      .catch(async (reason: Error) => {
        if (controller.signal.aborted) return;
        if (!target.current && pending.current) pending.current = retryRequest(pending.current, reason);
        await (await progress).hide();
        setError(reason);
        showFailureToast(reason, { title: failureTitle(isCheck) });
      });

    return () => {
      controller.abort();
      void progress.then((toast) => {
        if (latestToast.current === toastNumber) return toast.hide();
      });
    };
  }, [attempt]);

  const timedOut = done && generation !== undefined && !isFinished(generation);
  const slots = timedOut
    ? generation.variants.filter(isVariant).filter((variant) => variant.status !== "pending")
    : variantSlots(generation);
  const writing = !error && !done;
  const retry =
    error || timedOut ? (
      <Action
        title={target.current ? "Check Again" : "Try Again"}
        icon={Icon.ArrowClockwise}
        onAction={() => setAttempt((count) => count + 1)}
      />
    ) : undefined;
  const empty = error
    ? { title: failureTitle(checking), description: error.message }
    : timedOut && generation.unreachable
      ? { title: UNREACHABLE_TITLE, description: UNREACHABLE_ADVICE }
      : timedOut
        ? { title: "Still writing", description: "SocialFaktory is taking longer than usual. Check again in a moment." }
        : { title: "No variants", description: "SocialFaktory could not write this post. Try a more specific brief." };

  return (
    <List isLoading={writing} isShowingDetail={!error && slots.length > 0} navigationTitle="Post Variants">
      <List.EmptyView
        icon={Icon.XMarkCircle}
        title={empty.title}
        description={empty.description}
        actions={
          retry ? (
            <ActionPanel>
              {retry}
              {error && <SignInAgainAction onSignedIn={() => setAttempt((count) => count + 1)} />}
            </ActionPanel>
          ) : undefined
        }
      />
      {!error &&
        slots.map((variant, index) => (
          <VariantItem key={index} variant={variant} index={index} platform={platform} retry={retry} />
        ))}
    </List>
  );
}

function VariantItem({
  variant,
  index,
  platform,
  retry,
}: {
  variant: Variant;
  index: number;
  platform: string;
  retry?: ReactNode;
}) {
  const number = index + 1;

  if (variant.status === "pending") {
    return (
      <List.Item
        title={`Writing Variant ${number}`}
        icon={Icon.CircleProgress}
        detail={<List.Item.Detail markdown="Writing this variant in your brand's voice." />}
        actions={retry ? <ActionPanel>{retry}</ActionPanel> : undefined}
      />
    );
  }

  if (variant.status === "failed") {
    return (
      <List.Item
        title={`Variant ${number} Failed`}
        icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        detail={<List.Item.Detail markdown={variant.reason ?? "This variant could not be written."} />}
        actions={retry ? <ActionPanel>{retry}</ActionPanel> : undefined}
      />
    );
  }

  const text = variantText(variant);
  const parts = variant.parts?.length ?? 0;

  return (
    <List.Item
      title={firstLine(text, `Variant ${number}`)}
      icon={{ source: Icon.Document, tintColor: Color.Green }}
      detail={
        <List.Item.Detail
          markdown={text}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Variant" text={String(number)} />
              <List.Item.Detail.Metadata.Label title="Platform" text={platform} />
              <List.Item.Detail.Metadata.Label title="Characters" text={String(text.length)} />
              {parts > 1 && <List.Item.Detail.Metadata.Label title="Posts in Thread" text={String(parts)} />}
              {variant.violation && (
                <List.Item.Detail.Metadata.Label
                  title="Style Warning"
                  text={variant.violation}
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Post" content={text} />
          <Action.Paste title="Paste Post" content={text} />
          {retry}
        </ActionPanel>
      }
    />
  );
}
