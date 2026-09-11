// fallow-ignore-next-line unresolved-import
import * as Raycast from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { createExpense, getCategories, getRecipients, getWorkspaceContext, toFriendlyError } from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaExpenseUrl, getFigaExpensesUrl } from "./api/links";
import type {
  FigaCategory,
  FigaCategoryListResponse,
  FigaExpense,
  FigaExpenseCreatePayload,
  FigaRecipient,
  FigaRecipientListResponse,
  FigaWorkspaceContext,
} from "./api/types";
import {
  canReadResource,
  canWriteExpenses,
  escapeMarkdown,
  formatMoney,
  formatUnixDate,
  getWorkspaceBaseCurrency,
} from "./format";
import { ExpenseWriteGate, ReadCapabilityGate } from "./read-capability-gate";

const { Action, ActionPanel, Color, Detail, Form, Icon, Keyboard, Toast, openExtensionPreferences, showToast } =
  Raycast;
const NO_RECIPIENT_VALUE = "__figa_no_recipient__";
const NEW_CATEGORY_VALUE = "__figa_new_category__";
const NEW_RECIPIENT_VALUE = "__figa_new_recipient__";

type CreateExpenseArguments = Arguments.CreateExpense;

interface CreateExpenseCommandData {
  context: FigaWorkspaceContext;
  categories?: FigaCategoryListResponse;
  recipients?: FigaRecipientListResponse;
}

interface CreateExpenseFormValues {
  name: string;
  amount: string;
  categoryId: string;
  newCategoryName: string;
  recipientId: string;
  newRecipientName: string;
  expenseDate: Date | null;
  currency: string;
  description: string;
}

type CreateExpenseFormErrors = Partial<Record<keyof CreateExpenseFormValues, string>>;

export default function Command(props: Raycast.LaunchProps<{ arguments: CreateExpenseArguments }>) {
  const args = props.arguments ?? { name: "", amount: "", date: "" };
  const state = usePromise(loadCreateExpenseData);

  return <CreateExpenseCommandView args={args} {...state} />;
}

async function loadCreateExpenseData(): Promise<CreateExpenseCommandData> {
  const context = await getWorkspaceContext();
  if (
    !canWriteExpenses(context) ||
    !canReadResource(context, "categories") ||
    !canReadResource(context, "recipients")
  ) {
    return { context };
  }

  const [categories, recipients] = await Promise.all([getCategories(), getRecipients()]);
  return { context, categories, recipients };
}

function CreateExpenseCommandView({
  args,
  data,
  error,
  isLoading,
  revalidate,
}: {
  args: CreateExpenseArguments;
  data?: CreateExpenseCommandData;
  error?: unknown;
  isLoading: boolean;
  revalidate: () => void;
}) {
  return (
    <ExpenseWriteGate context={data?.context} error={error} onRetry={revalidate}>
      <ReadCapabilityGate context={data?.context} onRetry={revalidate} resource="categories">
        <ReadCapabilityGate context={data?.context} onRetry={revalidate} resource="recipients">
          <CreateExpenseContent args={args} data={data} isLoading={isLoading} onRetry={revalidate} />
        </ReadCapabilityGate>
      </ReadCapabilityGate>
    </ExpenseWriteGate>
  );
}

function CreateExpenseContent({
  args,
  data,
  isLoading,
  onRetry,
}: {
  args: CreateExpenseArguments;
  data?: CreateExpenseCommandData;
  isLoading: boolean;
  onRetry: () => void;
}) {
  const references = getLoadedReferences(data);

  if (isLoading || !references) {
    return <Detail isLoading={isLoading} markdown="# Loading Expense Form" />;
  }

  return (
    <CreateExpenseForm
      key={references.context.workspace.id}
      args={args}
      context={references.context}
      categories={references.categories}
      recipients={references.recipients}
      onRefresh={onRetry}
    />
  );
}

function getLoadedReferences(data: CreateExpenseCommandData | undefined): {
  context: FigaWorkspaceContext;
  categories: FigaCategory[];
  recipients: FigaRecipient[];
} | null {
  if (!data?.categories || !data.recipients) return null;

  return {
    context: data.context,
    categories: data.categories.categories,
    recipients: data.recipients.recipients,
  };
}

function CreateExpenseForm({
  args,
  context,
  categories,
  recipients,
  onRefresh,
}: {
  args: CreateExpenseArguments;
  context: FigaWorkspaceContext;
  categories: FigaCategory[];
  recipients: FigaRecipient[];
  onRefresh: () => void;
}) {
  const initialValues = useMemo(() => buildInitialValues(args, context, categories), [args, context, categories]);
  const [values, setValues] = useState<CreateExpenseFormValues>(initialValues);
  const [errors, setErrors] = useState<CreateExpenseFormErrors>({});
  const [createdExpense, setCreatedExpense] = useState<FigaExpense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState("");
  const [recipientSearchText, setRecipientSearchText] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const newCategorySearchName = getCreateReferenceName(categorySearchText, categories);
  const newRecipientSearchName = getCreateReferenceName(recipientSearchText, recipients);

  if (createdExpense) {
    return (
      <CreatedExpenseDetail
        context={context}
        expense={createdExpense}
        onCreateAnother={() => {
          idempotencyKeyRef.current = null;
          setErrors({});
          setCreatedExpense(null);
          setValues((current) => ({
            ...current,
            name: "",
            amount: "",
            description: "",
            expenseDate: new Date(),
          }));
        }}
      />
    );
  }

  function updateField<TField extends keyof CreateExpenseFormValues>(
    field: TField,
    value: CreateExpenseFormValues[TField],
  ) {
    idempotencyKeyRef.current = null;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateCategory(value: string) {
    idempotencyKeyRef.current = null;
    setValues((current) => ({
      ...current,
      categoryId: value,
      newCategoryName:
        value === NEW_CATEGORY_VALUE && newCategorySearchName ? newCategorySearchName : current.newCategoryName,
    }));
    setErrors((current) => ({ ...current, categoryId: undefined, newCategoryName: undefined }));
  }

  function updateRecipient(value: string) {
    idempotencyKeyRef.current = null;
    setValues((current) => ({
      ...current,
      recipientId: value,
      newRecipientName:
        value === NEW_RECIPIENT_VALUE && newRecipientSearchName ? newRecipientSearchName : current.newRecipientName,
    }));
    setErrors((current) => ({ ...current, recipientId: undefined, newRecipientName: undefined }));
  }

  async function handleSubmit(input: CreateExpenseFormValues): Promise<boolean> {
    if (isSubmitting) return false;

    const payload = await validateAndToast(input);
    if (!payload) return false;

    return submitExpense(payload);
  }

  async function validateAndToast(input: CreateExpenseFormValues): Promise<FigaExpenseCreatePayload | null> {
    const validation = validateFormValues(input);
    setErrors(validation.errors);

    if (validation.payload) return validation.payload;

    await showToast({
      style: Toast.Style.Failure,
      title: "Check expense details",
      message: "Fix the highlighted fields and try again.",
    });
    return null;
  }

  async function submitExpense(payload: FigaExpenseCreatePayload): Promise<boolean> {
    setIsSubmitting(true);
    idempotencyKeyRef.current ??= crypto.randomUUID();

    try {
      const response = await createExpense(payload, idempotencyKeyRef.current);
      await showToast({
        style: Toast.Style.Success,
        title: "Expense created",
        message: response.expense.name,
      });
      setCreatedExpense(response.expense);
      return true;
    } catch (submitError) {
      const friendlyError = toFriendlyError(submitError);
      await showToast({
        style: Toast.Style.Failure,
        title: friendlyError.title,
        message: friendlyError.message,
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<CreateExpenseFormValues>
            title={isSubmitting ? "Creating Expense" : "Create Expense"}
            icon={Icon.Receipt}
            shortcut={Keyboard.Shortcut.Common.Save}
            onSubmit={handleSubmit}
          />
          <Action
            title="Refresh Reference Data"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <Action.OpenInBrowser
            title="Open Expenses in Figa"
            icon={Icon.List}
            url={getFigaExpensesUrl(context.workspace.id)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.OpenInBrowser title="Open Developer API Docs" icon={Icon.Book} url={FIGA_DEVELOPER_API_DOCS_URL} />
          <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        autoFocus
        value={values.name}
        error={errors.name}
        onChange={(value) => updateField("name", value)}
      />
      <Form.TextField
        id="amount"
        title="Amount"
        value={values.amount}
        error={errors.amount}
        onChange={(value) => updateField("amount", value)}
      />
      <Form.Dropdown
        id="categoryId"
        title="Category"
        placeholder="Search or create category"
        value={values.categoryId}
        error={errors.categoryId}
        filtering
        onSearchTextChange={setCategorySearchText}
        onChange={updateCategory}
      >
        <Form.Dropdown.Item
          value={NEW_CATEGORY_VALUE}
          title={getCreateOptionTitle("Category", newCategorySearchName)}
          icon={{ source: Icon.PlusCircle, tintColor: Color.SecondaryText }}
          keywords={["new", "create"]}
        />
        {categories.map((category) => (
          <Form.Dropdown.Item
            key={category.id}
            value={category.id}
            title={category.name}
            icon={{ source: Icon.CircleFilled, tintColor: category.color ?? Color.SecondaryText }}
            keywords={getReferenceKeywords(category)}
          />
        ))}
      </Form.Dropdown>
      {values.categoryId === NEW_CATEGORY_VALUE ? (
        <Form.TextField
          id="newCategoryName"
          title="New Category Name"
          value={values.newCategoryName}
          error={errors.newCategoryName}
          onChange={(value) => updateField("newCategoryName", value)}
        />
      ) : null}
      <Form.Dropdown
        id="recipientId"
        title="Recipient"
        placeholder="Search or create recipient"
        value={values.recipientId}
        error={errors.recipientId}
        filtering
        onSearchTextChange={setRecipientSearchText}
        onChange={updateRecipient}
      >
        <Form.Dropdown.Item
          value={NO_RECIPIENT_VALUE}
          title="No Recipient"
          icon={{ source: Icon.MinusCircle, tintColor: Color.SecondaryText }}
        />
        <Form.Dropdown.Item
          value={NEW_RECIPIENT_VALUE}
          title={getCreateOptionTitle("Recipient", newRecipientSearchName)}
          icon={{ source: Icon.PlusCircle, tintColor: Color.SecondaryText }}
          keywords={["new", "create"]}
        />
        {recipients.map((recipient) => (
          <Form.Dropdown.Item
            key={recipient.id}
            value={recipient.id}
            title={recipient.name}
            icon={Icon.Person}
            keywords={getReferenceKeywords(recipient)}
          />
        ))}
      </Form.Dropdown>
      {values.recipientId === NEW_RECIPIENT_VALUE ? (
        <Form.TextField
          id="newRecipientName"
          title="New Recipient Name"
          value={values.newRecipientName}
          error={errors.newRecipientName}
          onChange={(value) => updateField("newRecipientName", value)}
        />
      ) : null}
      <Form.Separator />
      <Form.TextField
        id="currency"
        title="Currency"
        value={values.currency}
        error={errors.currency}
        onChange={(value) => updateField("currency", value.toUpperCase())}
      />
      <Form.DatePicker
        id="expenseDate"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={values.expenseDate}
        error={errors.expenseDate}
        onChange={(value) => updateField("expenseDate", value)}
      />
      <Form.TextArea
        id="description"
        title="Note"
        value={values.description}
        error={errors.description}
        onChange={(value) => updateField("description", value)}
      />
    </Form>
  );
}

function CreatedExpenseDetail({
  context,
  expense,
  onCreateAnother,
}: {
  context: FigaWorkspaceContext;
  expense: FigaExpense;
  onCreateAnother: () => void;
}) {
  const currency = expense.currency ?? getWorkspaceBaseCurrency(context);
  const formattedAmount = formatMoney(expense.amount, currency);
  const expenseUrl = getFigaExpenseUrl(context.workspace.id, expense.id);

  return (
    <Detail
      markdown={[
        "# Expense Created",
        "",
        `**${escapeMarkdown(expense.name)}**`,
        "",
        `${escapeMarkdown(formattedAmount)} · ${escapeMarkdown(formatUnixDate(expense.expenseDate))}`,
      ].join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workspace" icon={Icon.Building} text={context.workspace.name} />
          <Detail.Metadata.Label title="Expense ID" text={expense.id} />
          <Detail.Metadata.Label title="Amount" icon={Icon.Coins} text={formattedAmount} />
          <Detail.Metadata.Label title="Category" icon={Icon.Folder} text={expense.context.categoryName} />
          {expense.context.recipientName ? (
            <Detail.Metadata.Label title="Recipient" icon={Icon.Person} text={expense.context.recipientName} />
          ) : null}
          <Detail.Metadata.Link title="Expense" text="Open in Figa" target={expenseUrl} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Expense in Figa"
            icon={Icon.Link}
            url={expenseUrl}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action
            title="Create Another Expense"
            icon={Icon.Receipt}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={onCreateAnother}
          />
          <Action.OpenInBrowser
            title="Open Expenses in Figa"
            icon={Icon.List}
            url={getFigaExpensesUrl(context.workspace.id)}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.CopyToClipboard
            title="Copy Expense Name"
            icon={Icon.CopyClipboard}
            content={expense.name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action.CopyToClipboard title="Copy Expense ID" icon={Icon.Hashtag} content={expense.id} />
        </ActionPanel>
      }
    />
  );
}

function buildInitialValues(
  args: CreateExpenseArguments,
  context: FigaWorkspaceContext,
  categories: FigaCategory[],
): CreateExpenseFormValues {
  return {
    name: trimArgument(args.name),
    amount: trimArgument(args.amount),
    categoryId: getDefaultCategoryId(categories),
    newCategoryName: "",
    recipientId: NO_RECIPIENT_VALUE,
    newRecipientName: "",
    expenseDate: getInitialExpenseDate(args.date),
    currency: getWorkspaceBaseCurrency(context).toUpperCase(),
    description: "",
  };
}

function validateFormValues(values: CreateExpenseFormValues): {
  errors: CreateExpenseFormErrors;
  payload?: FigaExpenseCreatePayload;
} {
  const amount = parseAmountToCents(values.amount);
  const errors = getFormErrors(values, amount);

  if (hasBlockingValidationError(errors, amount)) return { errors };

  return { errors, payload: buildCreatePayload(values, amount) };
}

function buildCreatePayload(values: CreateExpenseFormValues, amount: number): FigaExpenseCreatePayload {
  const payload: FigaExpenseCreatePayload = {
    name: values.name.trim(),
    amount,
    categoryInput: getCategoryInput(values),
    recipientInput: getRecipientInput(values),
    currency: values.currency.trim().toUpperCase(),
  };

  const description = values.description.trim();
  if (description) payload.description = description;
  if (values.expenseDate) payload.expenseDate = Math.floor(values.expenseDate.getTime() / 1000);

  return payload;
}

function getFormErrors(values: CreateExpenseFormValues, amount: number | null): CreateExpenseFormErrors {
  return Object.fromEntries(
    [
      getNameError(values.name.trim()),
      getAmountError(amount),
      getCategoryError(values),
      getRecipientError(values),
      getCurrencyError(values.currency.trim().toUpperCase()),
      getDescriptionError(values.description.trim()),
    ].filter((entry): entry is [keyof CreateExpenseFormValues, string] => Boolean(entry)),
  );
}

function getNameError(name: string): [keyof CreateExpenseFormValues, string] | null {
  if (!name) return ["name", "Enter an expense name."];
  if (name.length > 200) return ["name", "Use 200 characters or fewer."];
  return null;
}

function getAmountError(amount: number | null): [keyof CreateExpenseFormValues, string] | null {
  return amount === null ? ["amount", "Enter a positive amount with up to 2 decimals."] : null;
}

function getCategoryInput(values: CreateExpenseFormValues): string {
  return values.categoryId === NEW_CATEGORY_VALUE ? values.newCategoryName.trim() : values.categoryId;
}

function getRecipientInput(values: CreateExpenseFormValues): string | null {
  if (values.recipientId === NO_RECIPIENT_VALUE) return null;
  return values.recipientId === NEW_RECIPIENT_VALUE ? values.newRecipientName.trim() : values.recipientId;
}

function getCategoryError(values: CreateExpenseFormValues): [keyof CreateExpenseFormValues, string] | null {
  if (values.categoryId !== NEW_CATEGORY_VALUE) {
    return values.categoryId ? null : ["categoryId", "Choose a category."];
  }

  const categoryName = values.newCategoryName.trim();
  if (!categoryName) return ["newCategoryName", "Enter a category name."];
  if (categoryName.length > 50) return ["newCategoryName", "Use 50 characters or fewer."];
  return null;
}

function getRecipientError(values: CreateExpenseFormValues): [keyof CreateExpenseFormValues, string] | null {
  if (values.recipientId !== NEW_RECIPIENT_VALUE) return null;

  const recipientName = values.newRecipientName.trim();
  if (!recipientName) return ["newRecipientName", "Enter a recipient name."];
  if (recipientName.length > 100) return ["newRecipientName", "Use 100 characters or fewer."];
  return null;
}

function getCurrencyError(currency: string): [keyof CreateExpenseFormValues, string] | null {
  return /^[A-Z]{3}$/.test(currency) ? null : ["currency", "Use a 3-letter currency code."];
}

function getDescriptionError(description: string): [keyof CreateExpenseFormValues, string] | null {
  return description.length > 1000 ? ["description", "Use 1000 characters or fewer."] : null;
}

function hasBlockingValidationError(errors: CreateExpenseFormErrors, amount: number | null): amount is null {
  return amount === null || Object.keys(errors).length > 0;
}

function parseAmountToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const whole = Number(wholePart);
  const fraction = Number(fractionPart.padEnd(2, "0"));
  const cents = whole * 100 + fraction;

  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function parseArgumentDate(value: string | undefined): Date | null {
  const trimmed = trimArgument(value);
  if (!trimmed) return null;

  return parseIsoArgumentDate(trimmed) ?? parseLooseArgumentDate(trimmed);
}

function parseIsoArgumentDate(value: string): Date | null {
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!isoDate) return null;

  return buildValidLocalDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
}

function parseLooseArgumentDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildValidLocalDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  const isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isValid ? date : null;
}

function getInitialExpenseDate(value: string | undefined): Date {
  return parseArgumentDate(value) ?? new Date();
}

function getDefaultCategoryId(categories: FigaCategory[]): string {
  return categories.length > 0 ? categories[0].id : NEW_CATEGORY_VALUE;
}

function trimArgument(value: string | undefined): string {
  return value ? value.trim() : "";
}

function getCreateOptionTitle(referenceType: "Category" | "Recipient", name: string): string {
  return name ? `Create "${name}"` : `Create New ${referenceType}...`;
}

function getCreateReferenceName(searchText: string, references: Array<FigaCategory | FigaRecipient>): string {
  const name = searchText.trim();
  if (!name) return "";

  const normalizedName = normalizeReferenceName(name);
  const hasExactMatch = references.some((reference) => normalizeReferenceName(reference.name) === normalizedName);

  return hasExactMatch ? "" : name;
}

function normalizeReferenceName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function getReferenceKeywords(item: FigaCategory | FigaRecipient): string[] {
  return [item.description, item.isGlobal ? "global" : "workspace"].filter((keyword): keyword is string =>
    Boolean(keyword),
  );
}
