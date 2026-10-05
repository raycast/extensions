import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { mxroute } from "./mxroute";

export default function SpamFilters({ domain }: { domain: string }) {
  type FormValues = {
    high_score: string;
    pre: string;
  };
  const { pop } = useNavigation();
  const { isLoading, data: spamSettings } = useCachedPromise(async () => {
    const highScore = await mxroute.domains.getSpamSettings(domain);
    return highScore;
  });
  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Saving");
      try {
        await mxroute.domains.updateSpamSettings(domain, { high_score: +values.high_score });
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
      high_score: String(spamSettings?.high_score || ""),
    },
    validation: {
      high_score(value) {
        if (!value) return "The item is required";
        if (!Number(value)) return "The item must be a number";
        if (Number(value) < 1 || Number(value) > 50) return "The item must be 1-50";
      },
    },
  });

  const PRE_DESCRIPTIONS: Record<string, string> = {
    30: "Very permissive — only obvious spam is auto-deleted",
    20: "Permissive — may let some spam through",
    15: "Balanced filtering for most users",
    10: "Aggressive — may catch some legitimate email",
    5: "Very aggressive — high risk of false positives",
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={domain} />
      <Form.Description title="Filter Strength" text="Adjust how aggressively spam is filtered" />
      <Form.Dropdown id="pre" title="Preconfigured Options" onChange={(v) => setValue("high_score", v)}>
        <Form.Dropdown.Item title="Choose from preconfigured" value="" />
        <Form.Dropdown.Item title="Bold Choice" value="30" />
        <Form.Dropdown.Item title="Relaxed" value="20" />
        <Form.Dropdown.Item title="Recommended" value="15" />
        <Form.Dropdown.Item title="Slightly Risky" value="10" />
        <Form.Dropdown.Item title="Dangerously High" value="5" />
      </Form.Dropdown>
      <Form.Description text={PRE_DESCRIPTIONS[values.pre]} />
      <Form.Separator />
      <Form.Description text="Advanced Settings" />
      <Form.TextField
        title="High Score Threshold"
        placeholder="15"
        info="Emails scoring at or above this value will be automatically rejected (1-50)."
        {...itemProps.high_score}
      />
    </Form>
  );
}
