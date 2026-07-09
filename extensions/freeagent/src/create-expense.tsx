import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readFile } from "fs/promises";
import path from "path";
import { authorizedWithFreeAgent } from "./oauth";
import { Category, ExpenseFormValues, ExpenseAttachmentData, User } from "./types";
import { fetchCategories, createExpense, getCurrentUser } from "./services/freeagent";
import { useFreeAgent } from "./hooks/useFreeAgent";
import { showFailureToast } from "@raycast/utils";
import { formatDateForAPI } from "./utils/formatting";

/**
 * Parses a monetary amount into a positive number.
 * Accepts whole numbers or up to two decimal places (e.g. "12", "12.5",
 * "12.50"). Rejects anything else, including partially numeric strings like
 * "12abc", so silently truncated amounts can't slip through. Returns null if
 * the input is invalid.
 */
function parseAmount(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;

  return value;
}

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

/**
 * Reads a receipt file from disk and returns the inline attachment payload
 * (base64 data, file name and content type) expected by the expenses API.
 */
async function buildAttachment(filePath: string): Promise<ExpenseAttachmentData> {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension];

  if (!contentType) {
    throw new Error("Unsupported receipt type. Use PNG, JPG, GIF or PDF.");
  }

  const buffer = await readFile(filePath);

  return {
    data: buffer.toString("base64"),
    file_name: path.basename(filePath),
    content_type: contentType,
  };
}

const CreateExpense = function Command() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { isLoading, isAuthenticated, accessToken, companyInfo, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const [categoryList, user] = await Promise.all([fetchCategories(accessToken), getCurrentUser(accessToken)]);

        setCategories(categoryList);
        setCurrentUser(user);
      } catch (error) {
        handleError(error, "Failed to fetch data");
      }
    }

    loadData();
  }, [isAuthenticated, accessToken]);

  async function handleSubmit(values: ExpenseFormValues) {
    if (!accessToken) {
      handleError(new Error("No access token available"), "Failed to create expense");
      return;
    }

    if (!currentUser) {
      handleError(new Error("User information not available"), "Failed to create expense");
      return;
    }

    if (!companyInfo) {
      handleError(new Error("Company information not available"), "Failed to create expense");
      return;
    }

    if (!values.category) {
      handleError(new Error("Please select a category"), "Failed to create expense");
      return;
    }

    const amount = parseAmount(values.gross_value);
    if (amount === null) {
      handleError(
        new Error("Invalid amount. Enter a positive value with up to two decimal places (e.g., 12.50)"),
        "Failed to create expense",
      );
      return;
    }

    try {
      let attachment: ExpenseAttachmentData | undefined;
      if (values.receipt && values.receipt.length > 0) {
        attachment = await buildAttachment(values.receipt[0]);
      }

      const expenseData = {
        user: currentUser.url,
        category: values.category,
        // FreeAgent records money spent as a negative gross value. Format to
        // two decimal places so amounts like 12.50 aren't sent as "-12.5".
        gross_value: (-amount).toFixed(2),
        currency: companyInfo.currency,
        dated_on: values.dated_on ? formatDateForAPI(values.dated_on) : formatDateForAPI(new Date()),
        description: values.description || undefined,
        sales_tax_rate: values.sales_tax_rate?.trim() ? values.sales_tax_rate.trim() : undefined,
        attachment,
      };

      await createExpense(accessToken, expenseData);

      showToast({
        style: Toast.Style.Success,
        title: "Expense created successfully",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to create expense" });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  const userDisplayName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Loading...";
  const formDescription = currentUser
    ? `Create a new expense for ${userDisplayName} in FreeAgent`
    : "Create a new expense in FreeAgent";

  // Group categories by their group description so the dropdown mirrors the
  // grouping shown in the FreeAgent web app.
  const categoryGroups = categories.reduce<Record<string, Category[]>>((groups, category) => {
    const group = category.group_description || "Other";
    (groups[group] ||= []).push(category);
    return groups;
  }, {});

  return (
    <Form
      isLoading={isLoading || !currentUser}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Expense" />
        </ActionPanel>
      }
    >
      <Form.Description text={formDescription} />

      <Form.Dropdown id="category" title="Category" placeholder="Select a category">
        {Object.entries(categoryGroups).map(([group, groupCategories]) => (
          <Form.Dropdown.Section key={group} title={group}>
            {groupCategories.map((category) => (
              <Form.Dropdown.Item
                key={category.url}
                value={category.url}
                title={`${category.nominal_code} — ${category.description}`}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="gross_value"
        title="Amount"
        placeholder="e.g., 12.50"
        info={`Gross amount spent${companyInfo ? ` in ${companyInfo.currency}` : ""}, including sales tax`}
      />

      <Form.DatePicker id="dated_on" title="Date" />

      <Form.TextField id="description" title="Description" placeholder="Enter a description (optional)" />

      <Form.TextField
        id="sales_tax_rate"
        title="Sales Tax Rate"
        placeholder="e.g., 20"
        info="Sales tax rate as a percentage (optional)"
      />

      <Form.FilePicker
        id="receipt"
        title="Receipt"
        allowMultipleSelection={false}
        info="Attach a receipt (PNG, JPG, GIF or PDF). Optional."
      />
    </Form>
  );
};

export default authorizedWithFreeAgent(CreateExpense);
