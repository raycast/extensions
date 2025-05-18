import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ActionPanel, Action, Form, Icon, showToast, Toast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_SPACE_AUTH_CODE_SENT, CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL } from "../utils/constants.util";
import { useEnabledSpaces } from "../hooks/use-enabled-spaces.hook";
import { TRPCError } from "@trpc/server";

type Action = "send-auth-code" | "disable-space" | "leave-space";

export function SpaceAuthFormBody(props: { spaceId: string; refetch: () => void | Promise<void> }) {
  const { spaceId, refetch } = props;
  const { disableSpace } = useEnabledSpaces();

  const space = trpc.space.get.useQuery({ spaceId });
  const { data: lastVerifiedEmail } = trpc.spaceAuth.lastVerifiedEmail.useQuery({ spaceId });
  const { data: spaceEmailPatterns } = trpc.spaceAuth.listMemberAuthPolicies.useQuery({ spaceId });

  const sendAuthCode = trpc.spaceAuth.sendAuthCode.useMutation();
  const verifyAuthCode = trpc.spaceAuth.verifyAuthCode.useMutation();
  const leave = trpc.space.leave.useMutation();

  const [authEmail, setAuthEmail] = useState("");
  const [verifyingAuthEmail, setVerifyingAuthEmail] = useCachedState(CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL, "");
  const [codeSent, setCodeSent] = useCachedState(CACHED_KEY_SPACE_AUTH_CODE_SENT, false);

  const [action, setAction] = useState<Action>("send-auth-code");
  const [code, setCode] = useState("");
  const emailRef = useRef<Form.TextField>(null);
  const verificationTokenRef = useRef<Form.TextField>(null);
  const actionRef = useRef<Form.Dropdown>(null);

  const handleLeaveSpace = async () => {
    const confirmed = await confirmAlert({
      title: "Leave Space",
      message:
        "Are you sure you want to leave this space? This is irreversible and can only be rejoined by invitation from space members.",
      primaryAction: {
        title: "Leave",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await leave.mutateAsync({ spaceId });
      showToast({
        style: Toast.Style.Success,
        title: "You have left the space",
      });
      refetch();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to leave the space",
        message: error instanceof TRPCError ? error.message : "Unknown error",
      });
    }
  };

  const handleDisableSpace = () => {
    disableSpace(spaceId);
    showToast({
      style: Toast.Style.Success,
      title: "Space disabled",
    });
    refetch();
  };

  const handleSendAuthCode = () => {
    const trimmedAuthEmail = authEmail.trim();
    if (!trimmedAuthEmail) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter your email",
      });
      return;
    }

    if (!z.string().email().safeParse(trimmedAuthEmail).success) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a valid email",
      });
      return;
    }

    sendAuthCode.mutate(
      {
        spaceId,
        authEmail: trimmedAuthEmail,
      },
      {
        onSuccess: () => {
          setVerifyingAuthEmail(trimmedAuthEmail);
          setCodeSent(true);
        },
      },
    );
  };

  const handleVerifyAuthCode = () => {
    if (!verifyingAuthEmail) {
      showToast({
        style: Toast.Style.Failure,
        title: "No email to verify",
      });
      return;
    }

    const trimmedCode = code.trim();
    if (!trimmedCode.match(/^.{6}$/)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please input a 6-character login code",
      });
      return;
    }

    verifyAuthCode.mutate(
      {
        spaceId,
        authEmail: verifyingAuthEmail,
        code: trimmedCode,
      },
      {
        onSuccess: async () => {
          showToast({
            style: Toast.Style.Success,
            title: "Successfully verified",
          });
          await refetch();
          setCodeSent(false);
          setVerifyingAuthEmail("");
          setAuthEmail("");
        },
      },
    );
  };

  const isLoading = sendAuthCode.isPending || verifyAuthCode.isPending || space.isFetching;

  useEffect(() => {
    if (!codeSent) {
      return;
    }

    verificationTokenRef.current?.focus();
  }, [codeSent]);

  if (!space.data) {
    return <Form isLoading={true} />;
  }

  const actionTitle =
    action === "send-auth-code" && codeSent
      ? "Confirm Auth Code"
      : action === "send-auth-code"
        ? "Send Auth Code to Email"
        : action === "disable-space"
          ? "Disable Space on This Device"
          : "Leave Space on All Devices";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={codeSent ? Icon.Key : Icon.Envelope}
            title={actionTitle}
            onSubmit={async () => {
              if (!codeSent && action === "disable-space") {
                handleDisableSpace();
                return;
              }

              if (!codeSent && action === "leave-space") {
                await handleLeaveSpace();
                return;
              }

              if (!codeSent && action === "send-auth-code") {
                handleSendAuthCode();
                return;
              }

              if (!code) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please input a 6-character login code",
                });
                return;
              }

              // Submit auth code
              handleVerifyAuthCode();
              return;
            }}
          />
          {codeSent && (
            <Action
              shortcut={{ modifiers: ["cmd"], key: "b" }}
              icon={Icon.ArrowLeft}
              onAction={() => {
                setCodeSent(false);
                setVerifyingAuthEmail("");
                setAuthEmail("");
                refetch();
              }}
              title="Back to Email Input"
            />
          )}

          {action !== "disable-space" && (
            <Action
              shortcut={{ modifiers: ["ctrl"], key: "d" }}
              icon={Icon.XMarkCircle}
              title="Disable Space on This Device"
              onAction={() => handleDisableSpace()}
            />
          )}

          {action !== "leave-space" && (
            <Action
              shortcut={Keyboard.Shortcut.Common.Remove}
              icon={Icon.Xmark}
              title="Leave Space on All Devices"
              onAction={() => handleLeaveSpace()}
            />
          )}
        </ActionPanel>
      }
    >
      {!codeSent && (
        <>
          <Form.Description title="🟠" text={`[${space.data.name}] space requires you to authenticate.`} />

          <Form.Dropdown ref={actionRef} id="action" title="Action" onChange={(e) => setAction(e as Action)}>
            <Form.Dropdown.Item value="send-auth-code" title="Send me an auth code" />
            <Form.Dropdown.Item value="disable-space" title="Disable this space on only this device" />
            <Form.Dropdown.Item value="leave-space" title="Leave this space on all devices" />
          </Form.Dropdown>

          {action === "disable-space" && (
            <Form.Description
              text={`This space will be disabled only on this device. You can re-enable it at any time by authenticating again in the space list.`}
            />
          )}

          {action === "leave-space" && (
            <Form.Description text={`You will be removed from this space on all devices.`} />
          )}

          {action === "send-auth-code" && spaceEmailPatterns && spaceEmailPatterns.length > 0 && (
            <Form.Description
              text={`This space allows only the following email patterns:\n${spaceEmailPatterns.join(", ")}`}
            />
          )}

          {action === "send-auth-code" && (
            <Form.TextField
              ref={emailRef}
              id="email"
              title="Email"
              placeholder="Email"
              onChange={(e) => setAuthEmail(e)}
              autoFocus={true}
            />
          )}

          {action === "send-auth-code" && lastVerifiedEmail && (
            <Form.Description text={`Last verified email: ${lastVerifiedEmail}`} />
          )}
        </>
      )}

      {codeSent && (
        <>
          <Form.Description text={`Login code sent to ${authEmail}.`} />
          <Form.Description text={`Enter the 6-digit auth code sent to your email.`} />
          <Form.TextField
            ref={verificationTokenRef}
            id="verificationToken"
            title="Verification Token"
            placeholder="Verification Token"
            onChange={(e) => setCode(e)}
          />
        </>
      )}
    </Form>
  );
}

export function SpaceAuthForm(props: Parameters<typeof SpaceAuthFormBody>[0]) {
  return (
    <CachedQueryClientProvider>
      <SpaceAuthFormBody {...props} />
    </CachedQueryClientProvider>
  );
}
