import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  PopToRootType,
  Toast,
  getSelectedFinderItems,
  showHUD,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { useState } from "react";
import { isoDay, parseAmountInput } from "./lib/format";
import type { StringKey } from "./lib/i18n";
import { openFolnaro, showError, useFolnaro, useTranslation } from "./lib/raycast";
import { EXPENSE_CATEGORIES, MAX_RECEIPT_BYTES, guessDate, guessVendor, isReceiptFile } from "./lib/receipt";

interface FormValues {
  files: string[];
  vendor: string;
  amount: string;
  date: Date | null;
  category: string;
  note: string;
}

function without<T extends object>(object: T, key: keyof T): T {
  const copy = { ...object };
  delete copy[key];
  return copy;
}

async function selectedReceipt(): Promise<string | undefined> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).find(isReceiptFile);
  } catch {
    // Finder is not frontmost or nothing is selected; the file picker covers that.
    return undefined;
  }
}

export default function CaptureReceipt() {
  const { language, t } = useTranslation();
  const api = useFolnaro(language);
  const { data, isLoading } = usePromise(
    async () => {
      const [allowed, path] = await Promise.all([api.allowedTools(), selectedReceipt()]);
      return { canCapture: allowed.has("expenses_create") && allowed.has("expenses_add_receipt_file"), path };
    },
    [],
    { onError: (error) => void showError(error, t) },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  if (data && !data.canCapture) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title={t("receipt.locked.title")}
          description={t("receipt.locked.description")}
          actions={
            <ActionPanel>
              <Action title={t("action.openFolnaro")} icon={Icon.AppWindow} onAction={() => openFolnaro()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // The form appears once the Finder selection is known, so its defaults can come from the file.
  if (!data) return <Form isLoading={isLoading} />;
  const path = data.path;

  const submit = async (values: FormValues) => {
    const next: typeof errors = {};
    const file = values.files?.[0];
    const amount = parseAmountInput(values.amount ?? "");
    if (!file) next.files = t("receipt.validation.file");
    else if (!isReceiptFile(file)) next.files = t("receipt.validation.type");
    else if (statSync(file).size > MAX_RECEIPT_BYTES) next.files = t("receipt.validation.size");
    if (!values.vendor?.trim()) next.vendor = t("receipt.validation.vendor");
    if (!amount) next.amount = t("receipt.validation.amount");
    setErrors(next);
    if (Object.keys(next).length || !file || !amount) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: t("receipt.saving") });
    try {
      const expense = await api.captureReceipt(
        {
          vendor: values.vendor.trim(),
          gross_amount: amount,
          date: values.date ? isoDay(values.date) : undefined,
          category: values.category || undefined,
          note: values.note?.trim() || undefined,
        },
        { name: basename(file), bytes: readFileSync(file) },
      );
      await toast.hide();
      await showHUD(t("receipt.saved", { vendor: expense.vendor }), { popToRootType: PopToRootType.Immediate });
    } catch (error) {
      await toast.hide();
      await showError(error, t);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("receipt.submit")} icon={Icon.Tray} onSubmit={submit} />
          <Action title={t("action.openInFolnaro")} icon={Icon.AppWindow} onAction={() => openFolnaro()} />
        </ActionPanel>
      }
    >
      <Form.Description text={path ? t("receipt.info") : t("receipt.noSelection")} />
      <Form.FilePicker
        id="files"
        title={t("receipt.file")}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        defaultValue={path ? [path] : []}
        error={errors.files}
        onChange={() => setErrors((current) => without(current, "files"))}
      />
      <Form.TextField
        id="vendor"
        title={t("receipt.vendor")}
        placeholder={t("receipt.vendorPlaceholder")}
        defaultValue={path ? guessVendor(path) : ""}
        error={errors.vendor}
        onChange={() => setErrors((current) => without(current, "vendor"))}
      />
      <Form.TextField
        id="amount"
        title={t("receipt.amount")}
        placeholder={t("receipt.amountPlaceholder")}
        error={errors.amount}
        onChange={() => setErrors((current) => without(current, "amount"))}
      />
      <Form.DatePicker
        id="date"
        title={t("receipt.date")}
        type={Form.DatePicker.Type.Date}
        defaultValue={(path && guessDate(path)) || new Date()}
      />
      <Form.Dropdown id="category" title={t("receipt.category")} defaultValue="">
        <Form.Dropdown.Item value="" title={t("receipt.categoryLater")} />
        {EXPENSE_CATEGORIES.map((category) => (
          <Form.Dropdown.Item key={category} value={category} title={t(`category.${category}` as StringKey)} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="note" title={t("receipt.note")} placeholder={t("receipt.notePlaceholder")} />
    </Form>
  );
}
