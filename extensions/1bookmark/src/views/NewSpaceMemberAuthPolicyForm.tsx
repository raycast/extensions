import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { useMemo, useState } from "react";
import { trpc } from "@/utils/trpc.util";
import { z } from "zod";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

function Body(props: { spaceId: string }) {
  const { spaceId } = props;
  const { data } = trpc.space.get.useQuery({ spaceId });

  const { pop } = useNavigation();
  const create = trpc.spaceAuth.createMemberAuthPolicy.useMutation();
  const check = trpc.spaceAuth.checkMySessionToPassAuthPolicy.useMutation();
  const [emailPattern, setEmailPattern] = useState("");
  const [authCheckInterval, setAuthCheckInterval] = useState("60d");

  const emailPatternError = useMemo(() => {
    if (!emailPattern) {
      return undefined;
    }

    if (z.string().email().safeParse(emailPattern).success) {
      return undefined;
    }

    if (
      z
        .string()
        .email()
        .safeParse(`example@${emailPattern.slice(1)}`).success
    ) {
      return undefined;
    }

    return "Type it like this: @example.com";
  }, [emailPattern]);

  async function handleSubmit() {
    if (!emailPattern) {
      showToast({
        title: "Email domain is required",
        style: Toast.Style.Failure,
      });
      return;
    }

    // If the account being configured doesn't match the policy being added,
    // you may not be able to access the space immediately after adding the policy.
    // Therefore, you must authenticate first before adding the policy.
    const policyToAdd = { emailPattern, authCheckInterval };

    try {
      const validSpaceAuth = await check.mutateAsync({ spaceId, policyToAdd });
      if (!validSpaceAuth) {
        showToast({
          title: "Before adding this policy, you need to authenticate to the space.",
          style: Toast.Style.Failure,
        });
        return;
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to check space authentication" });
      return;
    }

    create.mutate(
      { spaceId, emailPattern, authCheckInterval },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Created member auth policy",
          });
          pop();
        },
      },
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Member Auth Policy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="space" title="Space" defaultValue={spaceId}>
        <Form.Dropdown.Item value={spaceId} title={data?.name || ""} icon={data?.image || Icon.TwoPeople} />
      </Form.Dropdown>

      <Form.Description text="Members who have already joined with a domain other than the allowed domain will not be able to view the space's bookmarks until they re-authenticate with the allowed domain." />
      <Form.TextField
        id="emailPattern"
        title="Email Domain Pattern"
        autoFocus
        value={emailPattern}
        error={emailPatternError}
        onChange={(value) => setEmailPattern(value)}
      />

      <Form.Dropdown
        id="authCheckInterval"
        title="Auth Check Interval"
        defaultValue="60d"
        onChange={(value) => {
          setAuthCheckInterval(value);
        }}
      >
        <Form.Dropdown.Item value="99999d" title="Unlimited" />
        <Form.Dropdown.Item value="180d" title="180 days" />
        <Form.Dropdown.Item value="60d" title="60 days" />
        <Form.Dropdown.Item value="30d" title="30 days" />
        <Form.Dropdown.Item value="14d" title="14 days" />
      </Form.Dropdown>
    </Form>
  );
}

export const NewSpaceMemberAuthPolicyForm = (props: { spaceId: string }) => {
  const { spaceId } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  );
};
