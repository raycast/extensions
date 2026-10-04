import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { findHarborDrop, openHarborDrop } from "./lib/app";
import {
  AppVerificationSession,
  requireReady,
  safeURLPreview,
  validateURL,
} from "./lib/contract";
import {
  IntegrationError,
  isAppVerificationFailure,
  mustClearSharedState,
  safeMessage,
} from "./lib/errors";
import {
  forgetUnpublished,
  loadTrackedRequests,
  savePending,
} from "./lib/pending";
import { requestPresentation, TrackedRequest } from "./lib/request-tracking";
import {
  PendingRequest,
  loadSharedState,
  makeRequest,
  pendingReference,
  submitRequest,
  wakeURL,
} from "./lib/transport";
import { OpenAppAction, RequestStatus, showFailure } from "./lib/ui";

export default function Command() {
  const [url, setURL] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<TrackedRequest>();
  const [accessError, setAccessError] = useState<string>();
  const [accessDeadline, setAccessDeadline] = useState<number>();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const lifetime = useRef<AbortController | null>(null);
  const lifecycleGeneration = useRef(0);
  const refreshingAccess = useRef<{ mount: number; request: number } | null>(
    null,
  );
  const appVerification = useRef(new AppVerificationSession());
  const accessGeneration = useRef(0);
  const pendingGeneration = useRef(0);
  const refreshingPending = useRef<{ mount: number; request: number } | null>(
    null,
  );
  const refreshPending = useCallback(async () => {
    const mount = lifecycleGeneration.current;
    if (refreshingPending.current?.mount === mount || submitting.current)
      return;
    const current = ++pendingGeneration.current;
    const owner = { mount, request: current };
    refreshingPending.current = owner;
    try {
      const items = await loadTrackedRequests(lifetime.current?.signal);
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === pendingGeneration.current
      ) {
        setPending(items.find((item) => item.action === "reviewAddURL"));
      }
    } catch (value) {
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === pendingGeneration.current
      ) {
        setError(safeMessage(value));
      }
    } finally {
      if (refreshingPending.current === owner) refreshingPending.current = null;
    }
  }, []);
  const refreshAccess = useCallback(async (verify = false) => {
    const mount = lifecycleGeneration.current;
    if (
      refreshingAccess.current?.mount === mount ||
      (!verify && !appVerification.current.canPoll())
    )
      return;
    const current = ++accessGeneration.current;
    const owner = { mount, request: current };
    refreshingAccess.current = owner;
    const signal = lifetime.current?.signal;
    if (verify) setCheckingAccess(true);
    try {
      if (verify) {
        await appVerification.current.verify(() => findHarborDrop(signal));
      }
      const verifiedGeneration = appVerification.current.generation;
      const state = await loadSharedState();
      if (!appVerification.current.accepts(verifiedGeneration))
        throw new IntegrationError("cancelled");
      requireReady(state.descriptor, state.snapshot);
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === accessGeneration.current
      ) {
        setAccessDeadline(state.snapshot.access?.validUntil);
        setAccessError(undefined);
      }
    } catch (value) {
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === accessGeneration.current
      ) {
        setAccessDeadline(undefined);
        setAccessError(safeMessage(value));
      }
    } finally {
      if (refreshingAccess.current === owner) refreshingAccess.current = null;
      if (
        mounted.current &&
        mount === lifecycleGeneration.current &&
        current === accessGeneration.current
      )
        setCheckingAccess(false);
    }
  }, []);
  const handleVerificationFailure = useCallback((error: IntegrationError) => {
    appVerification.current.invalidate();
    accessGeneration.current += 1;
    if (mounted.current) {
      setAccessDeadline(undefined);
      setAccessError(safeMessage(error));
      setCheckingAccess(false);
    }
  }, []);
  const { push } = useNavigation();
  useEffect(() => {
    const mount = ++lifecycleGeneration.current;
    const controller = new AbortController();
    mounted.current = true;
    lifetime.current = controller;
    void refreshAccess(true);
    const timer = setInterval(() => {
      if (mount === lifecycleGeneration.current) {
        void refreshAccess();
        void refreshPending();
      }
    }, 2000);
    void refreshPending();
    return () => {
      controller.abort();
      clearInterval(timer);
      if (mount !== lifecycleGeneration.current) return;
      mounted.current = false;
      lifecycleGeneration.current += 1;
      accessGeneration.current += 1;
      pendingGeneration.current += 1;
      appVerification.current.invalidate();
      if (refreshingAccess.current?.mount === mount)
        refreshingAccess.current = null;
      if (refreshingPending.current?.mount === mount)
        refreshingPending.current = null;
    };
  }, [refreshAccess, refreshPending]);
  useEffect(() => {
    if (accessDeadline === undefined) return;
    const timer = setTimeout(
      () => {
        if (!mounted.current || accessDeadline > Date.now() / 1000) return;
        accessGeneration.current += 1;
        setAccessDeadline(undefined);
        setAccessError(safeMessage(new IntegrationError("accessExpired")));
      },
      Math.min(Math.max(0, accessDeadline * 1000 - Date.now()), 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [accessDeadline]);
  const accessReady =
    !checkingAccess &&
    appVerification.current.canPoll() &&
    !accessError &&
    accessDeadline !== undefined &&
    accessDeadline > Date.now() / 1000;
  function showRequest(request: PendingRequest) {
    const mount = lifecycleGeneration.current;
    push(
      <RequestStatus
        pending={request}
        onVerificationFailure={handleVerificationFailure}
      />,
      () => {
        if (!mounted.current || mount !== lifecycleGeneration.current) return;
        void refreshPending();
        void refreshAccess(true);
      },
    );
  }
  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const existing = (
        await loadTrackedRequests(lifetime.current?.signal)
      ).find((item) => item.action === "reviewAddURL");
      if (existing) {
        if (mounted.current) {
          pendingGeneration.current += 1;
          setPending(existing);
          showRequest(existing);
        }
        return;
      }
      accessGeneration.current += 1;
      const app = await appVerification.current.verify(() =>
        findHarborDrop(lifetime.current?.signal),
      );
      const request = makeRequest(await loadSharedState(), "reviewAddURL", {
        url: validateURL(url),
      });
      const reference = pendingReference(request);
      await savePending(reference);
      if (mounted.current) {
        pendingGeneration.current += 1;
        setPending({ ...reference, status: "unconfirmed" });
      }
      try {
        await submitRequest(request, app, { signal: lifetime.current?.signal });
      } catch (value) {
        if ((await forgetUnpublished(reference, value)) && mounted.current) {
          pendingGeneration.current += 1;
          setPending(undefined);
        }
        throw value;
      }
      if (mounted.current) setURL("");
      try {
        await openHarborDrop(
          wakeURL(reference.requestID),
          app,
          lifetime.current?.signal,
        );
      } catch (value) {
        if (mounted.current) {
          if (isAppVerificationFailure(value)) {
            handleVerificationFailure(value);
          }
          await showFailure(value);
        }
      }
      if (mounted.current) showRequest(reference);
    } catch (value) {
      if (mounted.current) {
        setError(safeMessage(value));
        if (isAppVerificationFailure(value)) handleVerificationFailure(value);
        if (mustClearSharedState(value)) {
          accessGeneration.current += 1;
          setCheckingAccess(false);
          setAccessDeadline(undefined);
          setAccessError(safeMessage(value));
        }
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function readClipboard() {
    try {
      const text = await Clipboard.readText();
      if (mounted.current) {
        setURL(validateURL(text ?? ""));
        setError(undefined);
      }
    } catch (value) {
      if (mounted.current) setError(safeMessage(value));
    }
  }
  return (
    <Form
      isLoading={busy || checkingAccess}
      enableDrafts={false}
      actions={
        <ActionPanel>
          {pending ? (
            <Action
              title="Check Previous Request"
              icon={Icon.Clock}
              onAction={() => showRequest(pending)}
            />
          ) : accessReady ? (
            <Action.SubmitForm
              title="Review in HarborDrop"
              icon={Icon.Download}
              onSubmit={submit}
            />
          ) : null}
          {accessReady && (
            <Action
              title="Use Current Clipboard"
              icon={Icon.Clipboard}
              onAction={readClipboard}
            />
          )}
          <Action
            title="Check Integration Access"
            icon={Icon.ArrowClockwise}
            onAction={() => refreshAccess(true)}
          />
          {pending && (
            <Action
              title="Check Request Status"
              icon={Icon.ArrowClockwise}
              onAction={refreshPending}
            />
          )}
          <OpenAppAction onVerificationFailure={handleVerificationFailure} />
        </ActionPanel>
      }
    >
      {accessError && (
        <Form.Description title="Downloads Unavailable" text={accessError} />
      )}
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/file.zip"
        value={url}
        onChange={setURL}
        error={error}
      />
      <Form.Description title="Preview" text={safeURLPreview(url)} />
      <Form.Description
        title="Approval"
        text="HarborDrop will ask you to confirm this URL and the download destination. This command does not read browser cookies or bypass licensing."
      />
      {pending && (
        <Form.Description
          title="Request to Check"
          text={`${requestPresentation(pending).subtitle}. Check this request before adding another download. It will not be resent automatically.`}
        />
      )}
    </Form>
  );
}
