import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Toast,
  confirmAlert,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import {
  getPlanSummary,
  removeLicense,
  resetUsage,
  saveLicenseKey,
  type PlanSummary,
} from "./entitlement";
import { parseLicenseKey } from "./license";
import {
  FREE_DAILY_REDACTIONS,
  FREE_PDF_PAGE_LIMIT,
  PRODUCT_NAME,
  PRO_PRICE,
  WEBSITE_URL,
} from "./plan";

export default function ManageLicense() {
  const { data: plan, isLoading, revalidate } = usePromise(getPlanSummary);

  async function removeFromThisComputer() {
    const confirmed = await confirmAlert({
      title: "Remove license from this computer?",
      message: "You can enter the key again at any time.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeLicense();
    revalidate();
    await showToast({ style: Toast.Style.Success, title: "License removed" });
  }

  async function resetTodaysUsage() {
    await resetUsage();
    revalidate();
    await showToast({ style: Toast.Style.Success, title: "Usage reset" });
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={plan ? planMarkdown(plan) : ""}
      actions={
        <ActionPanel>
          {plan?.license ? (
            <>
              <Action.CopyToClipboard
                title="Copy License Key"
                content={plan.licenseKey ?? ""}
              />
              <Action
                title="Remove License from This Computer"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={removeFromThisComputer}
              />
            </>
          ) : (
            <>
              <Action.OpenInBrowser
                title={`Buy ${PRODUCT_NAME} Pro`}
                icon={Icon.CreditCard}
                url={`${WEBSITE_URL}/#pricing`}
              />
              <Action.Push
                title="Enter License Key"
                icon={Icon.Key}
                target={<LicenseKeyForm />}
                onPop={revalidate}
              />
            </>
          )}
          {environment.isDevelopment && (
            <Action
              title="Reset Today's Usage"
              icon={Icon.ArrowCounterClockwise}
              onAction={resetTodaysUsage}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function planMarkdown({ license, remainingToday }: PlanSummary): string {
  if (license) {
    const issued = new Date(license.issuedAt).toLocaleDateString();
    return `# ${PRODUCT_NAME} Pro

Licensed to **${license.email}** on ${issued}.

- Unlimited image and PDF redactions
- No watermark
- PDFs of any length, with optional searchable text`;
  }

  return `# ${PRODUCT_NAME} Free

**${remainingToday} of ${FREE_DAILY_REDACTIONS}** redactions left today. The allowance resets at midnight, and reopening a file you already opened today is free.

Free exports include a small ${PRODUCT_NAME} watermark, and PDFs are limited to ${FREE_PDF_PAGE_LIMIT} pages.

## Upgrade once, keep it forever — ${PRO_PRICE.label}

- Unlimited image and PDF redactions
- No watermark
- PDFs of any length, with optional searchable text`;
}

function LicenseKeyForm() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ key: string }>({
    async onSubmit({ key }) {
      const license = await saveLicenseKey(key);
      await showToast({
        style: Toast.Style.Success,
        title: `${PRODUCT_NAME} Pro unlocked`,
        message: `Licensed to ${license.email}`,
      });
      pop();
    },
    validation: {
      key(value) {
        if (!value || !parseLicenseKey(value)) {
          return "That license key is not valid.";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Enter License Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Activate License"
            icon={Icon.Key}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.key}
        title="License key"
        placeholder="CLOAK-…"
      />
    </Form>
  );
}
