import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { CatchAllType } from "./types";
import { mxroute } from "./mxroute";

export default function Advanced({ selectedDomainName }: { selectedDomainName: string }) {
  type FormValues = {
    type: string;
    address?: string;
  };
  const { pop } = useNavigation();
  const { isLoading, data: catchAll } = useCachedPromise(
    async (domain: string) => {
      const catchAll = await mxroute.domains.catchAll.get(domain);
      return catchAll;
    },
    [selectedDomainName],
  );
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Saving");
      try {
        await mxroute.domains.catchAll.set(selectedDomainName, values);
        toast.style = Toast.Style.Success;
        toast.title = "Saved";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      type: catchAll?.type,
      address: catchAll?.address || undefined,
    },
    validation: {
      address(value) {
        if (values.type === CatchAllType.Forward && !value) return "The item is required";
      },
    },
  });

  const TYPE_DESCRIPTIONS: Record<CatchAllType, string> = {
    fail: "Emails to non-existent addresses are bounced back to the sender with an error message.",
    blackhole: "Emails to non-existent addresses are silently deleted. The sender receives no notification.",
    address: "All emails to non-existent addresses are forwarded to a specific email address.",
  };

  return !catchAll ? (
    <Detail isLoading={isLoading} markdown="Fetching Catch All Settings" />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={selectedDomainName} />
      <Form.Description
        title="Description"
        text="Configure what happens when email is sent to non-existent addresses."
      />
      <Form.Separator />
      <Form.Dropdown
        title="Catch-All Email"
        info={`Configure what happens when an email is sent to a non-existent address at ${selectedDomainName}.`}
        {...itemProps.type}
      >
        <Form.Dropdown.Item title="Reject (Recommended)" value={CatchAllType.Reject} />
        <Form.Dropdown.Item title="Discard Silently" value={CatchAllType.DiscardSilently} />
        <Form.Dropdown.Item title="Forward to Address" value={CatchAllType.Forward} />
      </Form.Dropdown>
      {values.type === CatchAllType.Forward && (
        <Form.TextField title="Forward to Address" placeholder="catchall@example.com" {...itemProps.address} />
      )}
      <Form.Description text={TYPE_DESCRIPTIONS[values.type as CatchAllType]} />
    </Form>
  );
}
