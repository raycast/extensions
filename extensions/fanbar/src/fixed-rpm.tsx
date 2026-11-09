import { Action, ActionPanel, Detail, Form, Icon, Toast, showHUD, showToast } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { RecoveryActions, failureMarkdown, showFailureToast } from "./lib/components";
import { FanBarStatus, formatRPM, runFanBar, sharedRange } from "./lib/fanbar";

interface FixedRPMValues {
  rpm: string;
  hold: boolean;
}

export default function FixedRPM() {
  const { data, error, isLoading, revalidate } = usePromise(async () => (await runFanBar(["status"])).status, [], {
    onError: () => undefined,
  });

  if (error && !isLoading) {
    return (
      <Detail
        markdown={failureMarkdown(error)}
        actions={
          <ActionPanel>
            <RecoveryActions onRetry={revalidate} />
          </ActionPanel>
        }
      />
    );
  }
  // Mount the form once the fans are known, so its validation sees their range.
  if (!data) return <Form isLoading={isLoading} />;
  return <FixedRPMForm status={data} />;
}

function FixedRPMForm(props: { status: FanBarStatus }) {
  const { status } = props;
  const range = sharedRange(status.fans);
  // Fans whose ranges don't overlap have no speed FanBar will accept for all of them.
  const noSharedRange = status.fans.length > 0 && !range;

  const { handleSubmit, itemProps } = useForm<FixedRPMValues>({
    initialValues: {
      rpm: String(status.fixedRPM ?? range?.min ?? ""),
      hold: false,
    },
    validation: {
      rpm: (value) => {
        if (!value?.trim()) return FormValidation.Required;
        if (!/^\d+$/.test(value.trim())) return "Enter a whole number";
        if (noSharedRange) return "These fans share no speed range";
        const rpm = Number(value);
        if (range && (rpm < range.min || rpm > range.max)) {
          return `Between ${range.min.toLocaleString("en-US")} and ${range.max.toLocaleString("en-US")}`;
        }
      },
    },
    async onSubmit(values) {
      const rpm = Number(values.rpm.trim());
      const toast = await showToast({ style: Toast.Style.Animated, title: `Setting fans to ${formatRPM(rpm)}…` });
      try {
        const reply = await runFanBar(["mode", "fixed", String(rpm)], { hold: values.hold });
        await toast.hide();
        await showHUD(reply.message || `Fixed ${formatRPM(rpm)}`);
      } catch (error) {
        await toast.hide();
        await showFailureToast(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Fixed RPM" icon={Icon.Gauge} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="RPM"
        placeholder={range ? `${range.min}–${range.max}` : "RPM"}
        info="Every fan runs at this speed."
        {...itemProps.rpm}
      />
      <Form.Checkbox
        label="Hold until changed"
        info="Without it, macOS control returns after the Restore automatic control timer in FanBar Settings."
        {...itemProps.hold}
      />
      <Form.Separator />
      {status.fans.map((fan) => (
        <Form.Description
          key={fan.index}
          title={`Fan ${fan.index + 1}`}
          text={`${formatRPM(fan.currentRPM)} now · ${fan.minimumRPM.toLocaleString("en-US")}–${formatRPM(fan.maximumRPM)}`}
        />
      ))}
      {noSharedRange && (
        <Form.Description
          title="Fans"
          text="These fans' speed ranges don't overlap, so no single RPM suits them all."
        />
      )}
      {status.fans.length === 0 && (
        <Form.Description title="Fans" text="FanBar reported no fans, so the RPM is not checked here." />
      )}
    </Form>
  );
}
