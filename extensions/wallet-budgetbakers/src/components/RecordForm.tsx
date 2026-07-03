import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  PAYMENT_TYPES,
  PaymentType,
  WalletRecord,
  createRecords,
  getAccounts,
  getCategories,
  getLabels,
  patchRecords,
} from "../lib/api";
import { parseMoney } from "../lib/format";

const RESTRICTED_CATEGORIES = new Set([
  "debt",
  "transfer",
  "shopping list",
  "uncategorized",
]);

interface Props {
  record?: WalletRecord;
  onDone?: () => void;
}

export default function RecordForm({ record, onDone }: Props) {
  const { pop } = useNavigation();
  const isEdit = record !== undefined;
  const existingMoney = record ? parseMoney(record.amount) : null;
  const isBankSync = record?.accountIsBankSync === true;
  const isLockedBankRecord = isBankSync && record?.recordState === "uncleared";
  // Bank-synced records lock amount, date and state in the API.
  const showAmountFields = !isEdit || !isBankSync;

  const { data: accounts, isLoading: loadingAccounts } =
    useCachedPromise(getAccounts);
  const { data: categories, isLoading: loadingCategories } =
    useCachedPromise(getCategories);
  const { data: labels, isLoading: loadingLabels } =
    useCachedPromise(getLabels);

  const [recordType, setRecordType] = useState<string>(
    record?.recordType ??
      (existingMoney && existingMoney.value > 0 ? "income" : "expense"),
  );
  const [amountError, setAmountError] = useState<string | undefined>();

  async function handleSubmit(values: {
    amount: string;
    accountId: string;
    categoryId: string;
    recordDate: Date | null;
    paymentType: string;
    note: string;
    counterParty: string;
    labelIds: string[];
  }) {
    let signedAmount: number | undefined;
    if (showAmountFields) {
      const parsed = Number((values.amount ?? "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setAmountError("Enter a positive amount, e.g. 12.50");
        return;
      }
      signedAmount =
        recordType === "expense" ? -Math.abs(parsed) : Math.abs(parsed);
    }
    const recordDate = (values.recordDate ?? new Date()).toISOString();

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isEdit ? "Updating record…" : "Creating record…",
    });
    try {
      if (isEdit && record) {
        await patchRecords([
          {
            id: record.id,
            categoryId: values.categoryId || undefined,
            paymentType: (values.paymentType || undefined) as
              PaymentType | undefined,
            note: values.note || undefined,
            counterParty: values.counterParty || undefined,
            labelIds: values.labelIds,
            ...(isBankSync ? {} : { amount: signedAmount, recordDate }),
          },
        ]);
      } else {
        await createRecords([
          {
            accountId: values.accountId,
            amount: signedAmount as number,
            recordDate,
            categoryId: values.categoryId || undefined,
            paymentType: (values.paymentType || undefined) as
              PaymentType | undefined,
            note: values.note || undefined,
            counterParty: values.counterParty || undefined,
            labelIds: values.labelIds.length > 0 ? values.labelIds : undefined,
          },
        ]);
      }
      toast.style = Toast.Style.Success;
      toast.title = isEdit ? "Record updated" : "Record created";
      if (onDone) {
        onDone();
        pop();
      } else {
        await popToRoot();
      }
    } catch (error) {
      toast.hide();
      await showFailureToast(error, {
        title: isEdit ? "Could not update record" : "Could not create record",
      });
    }
  }

  const selectableCategories = (categories ?? []).filter(
    (category) =>
      category.enabled !== false &&
      category.archived !== true &&
      !RESTRICTED_CATEGORIES.has((category.name ?? "").toLowerCase()),
  );
  // Keep the record's current category selectable even if it's archived or
  // restricted, so the dropdown default always matches an item.
  const currentCategory = record?.category;
  if (
    currentCategory?.id &&
    !selectableCategories.some((category) => category.id === currentCategory.id)
  ) {
    selectableCategories.unshift({
      id: currentCategory.id,
      name: currentCategory.name ?? "Current category",
      color: currentCategory.color,
    });
  }
  const activeAccounts = (accounts ?? []).filter(
    (account) => account.archived !== true,
  );
  const isTransferRecord =
    record?.paymentType === "transfer" || record?.transfer != null;

  if (isEdit && isLockedBankRecord) {
    return (
      <Form navigationTitle="Edit Record">
        <Form.Description
          title="Record Not Editable"
          text="This record is still uncleared on a bank-synced account. The Wallet API does not allow modifying it until the bank settles it."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={loadingAccounts || loadingCategories || loadingLabels}
      navigationTitle={isEdit ? "Edit Record" : "Add Record"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Create Record"}
            icon={isEdit ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {isEdit && isBankSync && (
        <Form.Description
          title="Bank-Synced Account"
          text="Amount, date and state are locked by the API. You can still change category, note, payee, payment type and labels."
        />
      )}
      {showAmountFields && (
        <Form.Dropdown
          id="recordType"
          title="Type"
          value={recordType}
          onChange={setRecordType}
        >
          <Form.Dropdown.Item
            value="expense"
            title="Expense"
            icon={Icon.ArrowDown}
          />
          <Form.Dropdown.Item
            value="income"
            title="Income"
            icon={Icon.ArrowUp}
          />
        </Form.Dropdown>
      )}
      {showAmountFields && (
        <Form.TextField
          id="amount"
          title="Amount"
          placeholder="12.50"
          defaultValue={
            existingMoney ? String(Math.abs(existingMoney.value)) : ""
          }
          error={amountError}
          onChange={() => setAmountError(undefined)}
        />
      )}
      {!isEdit && (
        <Form.Dropdown id="accountId" title="Account" storeValue>
          {activeAccounts.map((account) => (
            <Form.Dropdown.Item
              key={account.id}
              value={account.id}
              title={account.name ?? account.id}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown
        id="categoryId"
        title="Category"
        defaultValue={record?.category?.id ?? ""}
      >
        <Form.Dropdown.Item value="" title="(Automatic)" icon={Icon.Wand} />
        {selectableCategories.map((category) => (
          <Form.Dropdown.Item
            key={category.id}
            value={category.id}
            title={category.name ?? category.id}
            icon={{ source: Icon.Circle, tintColor: category.color }}
          />
        ))}
      </Form.Dropdown>
      {showAmountFields && (
        <Form.DatePicker
          id="recordDate"
          title="Date"
          defaultValue={
            record?.recordDate ? new Date(record.recordDate) : new Date()
          }
        />
      )}
      <Form.Dropdown
        id="paymentType"
        title="Payment Type"
        defaultValue={record?.paymentType ?? "debit_card"}
        storeValue={!isEdit}
      >
        {PAYMENT_TYPES.filter(
          (paymentType) => paymentType.value !== "transfer" || isTransferRecord,
        ).map((paymentType) => (
          <Form.Dropdown.Item
            key={paymentType.value}
            value={paymentType.value}
            title={paymentType.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="counterParty"
        title="Payee"
        placeholder="Amazon, Starbucks…"
        defaultValue={record?.counterParty ?? ""}
      />
      <Form.TextField
        id="note"
        title="Note"
        placeholder="Description (max 255)"
        defaultValue={record?.note ?? ""}
      />
      <Form.TagPicker
        id="labelIds"
        title="Labels"
        defaultValue={(record?.labels ?? [])
          .map((label) => label.id ?? "")
          .filter(Boolean)}
      >
        {(labels ?? [])
          .filter((label) => label.archived !== true)
          .map((label) => (
            <Form.TagPicker.Item
              key={label.id}
              value={label.id}
              title={label.name ?? label.id}
              icon={{ source: Icon.Tag, tintColor: label.color }}
            />
          ))}
      </Form.TagPicker>
    </Form>
  );
}
