import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  FormValidation,
  showFailureToast,
  useCachedPromise,
  useForm,
} from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import {
  createExpense,
  createExpenseWithFile,
  getTimerProjectName,
  getTimerStatus,
} from "./api";

interface FormValues {
  amount: string;
  description: string;
  attachFile: string[];
}

export default function AddExpense() {
  const { pop } = useNavigation();
  const {
    data: timer,
    isLoading,
    error,
  } = useCachedPromise(getTimerStatus, [], { initialData: null });

  const taskId = timer?.task?.id;
  const blocking =
    timer && timer.status === "stopped"
      ? "No timer running. Start a timer first to add expenses."
      : timer && !taskId
        ? "Timer has no associated task."
        : null;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (!taskId) return;
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Adding expense...",
        });
        const amount = values.amount.trim();
        const description = values.description.trim() || undefined;
        if (values.attachFile.length > 0) {
          const filePath = values.attachFile[0];
          const fileName = path.basename(filePath);
          const fileBuffer = fs.readFileSync(filePath);
          const uint8Array = new Uint8Array(
            fileBuffer.buffer,
            fileBuffer.byteOffset,
            fileBuffer.byteLength,
          );
          const blob = new Blob([uint8Array]);
          await createExpenseWithFile({
            taskId,
            amount,
            description,
            file: blob,
            fileName,
          });
          await showToast({
            style: Toast.Style.Success,
            title: "Expense added with receipt",
            message: fileName,
          });
        } else {
          await createExpense({ taskId, amount, description });
          await showToast({
            style: Toast.Style.Success,
            title: "Expense added",
            message: description ?? amount,
          });
        }
        pop();
      } catch (err) {
        showFailureToast(err, { title: "Failed to add expense" });
      }
    },
    validation: {
      amount: (value) => {
        if (!value || value.trim() === "") return "Amount is required";
        const num = Number(value);
        if (Number.isNaN(num)) return "Amount must be a number";
        if (num < 0) return "Amount cannot be negative";
      },
      description: FormValidation.Required,
    },
  });

  if (error) {
    return (
      <Form>
        <Form.Description
          title="⚠️ Error"
          text={`Failed to load timer: ${String(error)}`}
        />
      </Form>
    );
  }

  if (blocking) {
    return (
      <Form>
        <Form.Description title="⚠️ Error" text={blocking} />
      </Form>
    );
  }

  const projectName = timer ? getTimerProjectName(timer) : "Loading...";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Expense"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="📍 Timer"
        text={`Adding expense to: ${projectName ?? "Unknown project"}`}
      />
      <Form.Separator />
      <Form.TextField
        title="Amount"
        placeholder="0.00"
        info="Expense amount in your account's currency"
        {...itemProps.amount}
      />
      <Form.TextField
        title="Description"
        placeholder="What was this expense for?"
        {...itemProps.description}
      />
      <Form.FilePicker
        title="Attach Receipt"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Attach a receipt image or PDF to this expense"
        {...itemProps.attachFile}
      />
    </Form>
  );
}
