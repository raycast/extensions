import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { basename } from "node:path";
import { readClipboardImage } from "./clipboard-image";
import {
  claimEntitlement,
  getPlanSummary,
  type PlanSummary,
} from "./entitlement";
import { getSelectedFilePath } from "./file-selection";
import {
  FREE_DAILY_REDACTIONS,
  MANAGE_LICENSE_DEEPLINK,
  PRODUCT_NAME,
  PRO_PRICE,
} from "./plan";
import {
  PDF_MIME_TYPE,
  countPdfPages,
  fingerprintFile,
  validateSource,
} from "./source-file";
import { openEditor } from "./editor-server";

type FormValues = { image: string[] };

export default function RedactImage() {
  const [isOpening, setIsOpening] = useState(false);
  const { data: plan, revalidate: refreshPlan } = usePromise(getPlanSummary);

  async function openSource(sourcePath: string, cleanup?: () => Promise<void>) {
    setIsOpening(true);
    try {
      const mimeType = await validateSource(sourcePath);
      const pageCount =
        mimeType === PDF_MIME_TYPE
          ? await countPdfPages(sourcePath)
          : undefined;
      const entitlement = await claimEntitlement(
        await fingerprintFile(sourcePath),
        pageCount,
      );
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening private editor…",
      });
      await openEditor(sourcePath, mimeType, {
        filename: basename(sourcePath),
        kind: mimeType === PDF_MIME_TYPE ? "pdf" : "image",
        entitlement,
        upgradeUrl: MANAGE_LICENSE_DEEPLINK,
        priceLabel: PRO_PRICE.label,
      });
      refreshPlan();

      if (entitlement.plan === "free" && !entitlement.canExport) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Export locked on the free plan",
          message: entitlement.lockReason,
          primaryAction: { title: "Upgrade", onAction: openManageLicense },
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Loaded in the private editor",
          message: "The original will not be changed.",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open file",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (cleanup) await cleanup().catch(() => undefined);
      setIsOpening(false);
    }
  }

  async function openClipboardImage() {
    try {
      const clipboardImage = await readClipboardImage();
      await openSource(clipboardImage.path, clipboardImage.cleanup);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No clipboard image",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { image: [] },
    async onSubmit(values) {
      await openSource(values.image[0] ?? "");
    },
    validation: {
      image(value) {
        if (!value?.length) return "Choose an image or PDF.";
      },
    },
  });

  useEffect(() => {
    let active = true;
    void getSelectedFilePath().then((path) => {
      if (active && path) setValue("image", [path]);
    });
    return () => {
      active = false;
    };
  }, [setValue]);

  return (
    <Form
      isLoading={isOpening}
      navigationTitle={footerTitle(plan)}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Redaction Canvas"
            icon={Icon.EyeDisabled}
            onSubmit={handleSubmit}
          />
          <Action
            title="Use Clipboard Image"
            icon={Icon.Clipboard}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "v" },
              Windows: { modifiers: ["ctrl"], key: "v" },
            }}
            onAction={openClipboardImage}
          />
          <Action
            title={plan?.license ? "Manage License" : "Upgrade to Pro"}
            icon={Icon.Key}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "u" },
              Windows: { modifiers: ["ctrl"], key: "u" },
            }}
            onAction={openManageLicense}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose an image or PDF, or press ⌘/Ctrl+V to use a clipboard image. Export creates a new file and never overwrites the source." />
      <Form.FilePicker
        {...itemProps.image}
        title="Image or PDF"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
}

function footerTitle(plan: PlanSummary | undefined): string {
  if (!plan) return PRODUCT_NAME;
  if (plan.license) return `${PRODUCT_NAME} Pro`;
  return `${PRODUCT_NAME} Free · ${plan.remainingToday} of ${FREE_DAILY_REDACTIONS} left today`;
}

async function openManageLicense() {
  await launchCommand({
    name: "manage-license",
    type: LaunchType.UserInitiated,
  });
}
