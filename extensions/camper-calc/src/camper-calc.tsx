import { useEffect, useState } from "react";
import {
  ActionPanel,
  Action,
  List,
  Form,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
  Clipboard,
  confirmAlert,
  Alert,
} from "@raycast/api";

interface Expense {
  id: string;
  year: number;
  category: string;
  description: string;
  amount: number;
}

interface UsageDays {
  year: number;
  days: number;
}

interface StorageData {
  version: number;
  expenses: Expense[];
  usageDays: UsageDays[];
}

const DATA_VERSION = 1;
const STORAGE_KEY = "camper-calc-data";

// 🔧 CATEGORIES — Add or rename categories here
const CATEGORIES = [
  "Purchase",
  "Additional Equipment",
  "Maintenance",
  "Vehicle Inspection",
  "Repair",
  "Tires",
  "Pitch / Campsite",
  "Fuel",
  "Garage",
  "Insurance",
  "Residual Value",
  "Other",
];

// 📝 CATEGORY MIGRATION — Define renames here
const CATEGORY_MIGRATIONS: { [oldName: string]: string } = {
  // Legacy German keys (for users migrating from womo-calc JSON exports)
  Anschaffung: "Purchase",
  Zusatzausstattung: "Additional Equipment",
  Wartung: "Maintenance",
  TÜV: "Vehicle Inspection",
  Reparatur: "Repair",
  Reifen: "Tires",
  Stellplatz: "Pitch / Campsite",
  Sprit: "Fuel",
  Garage: "Garage",
  Versicherung: "Insurance",
  Restwert: "Residual Value",
  "Restwert (negativ)": "Residual Value",
  Sonstiges: "Other",
};

export default function Command() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [usageDays, setUsageDays] = useState<UsageDays[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (data) {
        const parsed: StorageData = JSON.parse(data);
        const migratedExpenses = migrateExpenses(parsed.expenses || []);
        setExpenses(migratedExpenses);
        setUsageDays(parsed.usageDays || []);
        if (parsed.version !== DATA_VERSION) {
          await saveData(migratedExpenses, parsed.usageDays || []);
          void showToast(Toast.Style.Success, "Data updated", "Migration successful");
        }
      }
    } catch (error) {
      console.error("Load error:", error);
      void showToast(Toast.Style.Failure, "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  function migrateExpenses(rawExpenses: Expense[]): Expense[] {
    return rawExpenses.map((expense) => {
      const migratedCategory = CATEGORY_MIGRATIONS[expense.category] ?? expense.category;
      if (!CATEGORIES.includes(migratedCategory)) {
        console.warn(`Category "${migratedCategory}" not found. Falling back to "Other".`);
        return { ...expense, category: "Other" };
      }
      return { ...expense, category: migratedCategory };
    });
  }

  async function saveData(newExpenses: Expense[], newUsageDays: UsageDays[]) {
    const data: StorageData = {
      version: DATA_VERSION,
      expenses: newExpenses,
      usageDays: newUsageDays,
    };
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function exportCSV() {
    try {
      let csv = "Year,Category,Description,Amount\n";
      const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
      expenses
        .sort((a, b) => a.year - b.year)
        .forEach((e) => {
          const amount = e.amount.toFixed(2);
          csv += `${e.year},${quote(e.category)},${quote(e.description)},${amount}\n`;
        });
      csv += "\n";
      csv += "Year,Usage Days\n";
      usageDays
        .sort((a, b) => a.year - b.year)
        .forEach((u) => {
          csv += `${u.year},${u.days}\n`;
        });
      await Clipboard.copy(csv);
      void showToast(Toast.Style.Success, "CSV exported", "Copied to clipboard");
    } catch (e) {
      console.error(e);
      void showToast(Toast.Style.Failure, "CSV export failed");
    }
  }

  async function exportData() {
    try {
      const data: StorageData = { version: DATA_VERSION, expenses, usageDays };
      const jsonString = JSON.stringify(data, null, 2);
      await Clipboard.copy(jsonString);
      void showToast(Toast.Style.Success, "Data exported", "JSON copied to clipboard");
    } catch (e) {
      console.error(e);
      void showToast(Toast.Style.Failure, "Export failed");
    }
  }

  async function importData() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        void showToast(Toast.Style.Failure, "Clipboard is empty");
        return;
      }
      const parsed: StorageData = JSON.parse(clipboardText);
      if (!parsed.expenses || !Array.isArray(parsed.expenses)) {
        void showToast(Toast.Style.Failure, "Invalid data format");
        return;
      }
      const migratedExpenses = migrateExpenses(parsed.expenses);
      const confirmed = await confirmAlert({
        title: "Replace all data?",
        message: `This will replace all current data with ${migratedExpenses.length} imported expenses. This cannot be undone.`,
        primaryAction: {
          title: "Import",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
      setExpenses(migratedExpenses);
      setUsageDays(parsed.usageDays || []);
      await saveData(migratedExpenses, parsed.usageDays || []);
      void showToast(Toast.Style.Success, "Data imported", `${migratedExpenses.length} expenses loaded`);
    } catch (e) {
      console.error(e);
      void showToast(Toast.Style.Failure, "Import failed", "Invalid JSON data");
    }
  }

  async function resetAllData() {
    const confirmed = await confirmAlert({
      title: "Delete all data?",
      message: "This action cannot be undone. Export your data first!",
      primaryAction: {
        title: "Delete Everything",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await LocalStorage.removeItem(STORAGE_KEY);
      setExpenses([]);
      setUsageDays([]);
      void showToast(Toast.Style.Success, "All data deleted");
    }
  }

  async function deleteExpense(id: string) {
    const newExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(newExpenses);
    await saveData(newExpenses, usageDays);
    void showToast(Toast.Style.Success, "Expense deleted");
  }

  async function deleteUsageDays(year: number) {
    const newUsageDays = usageDays.filter((u) => u.year !== year);
    setUsageDays(newUsageDays);
    await saveData(expenses, newUsageDays);
    void showToast(Toast.Style.Success, "Usage days deleted");
  }

  function calculateStats() {
    let grossExpenses = 0;
    let residualValue = 0;

    // Use only the most recent residual value entry (highest year)
    const residualEntries = expenses.filter((e) => e.category === "Residual Value");
    if (residualEntries.length > 0) {
      const latest = residualEntries.sort((a, b) => b.year - a.year)[0];
      residualValue = latest.amount;
    }

    // Gross = all expenses except residual value entries
    expenses.forEach((e) => {
      if (e.category !== "Residual Value") {
        grossExpenses += e.amount;
      }
    });

    const netExpenses = grossExpenses - residualValue;
    const totalDays = usageDays.reduce((sum, u) => sum + u.days, 0);
    const costPerDay = totalDays > 0 ? netExpenses / totalDays : 0;

    const byYear: { [year: number]: { expenses: number; days: number } } = {};
    expenses.forEach((e) => {
      if (!byYear[e.year]) byYear[e.year] = { expenses: 0, days: 0 };
      // Residual value excluded from yearly breakdown
      if (e.category !== "Residual Value") {
        byYear[e.year].expenses += e.amount;
      }
    });
    usageDays.forEach((u) => {
      if (!byYear[u.year]) byYear[u.year] = { expenses: 0, days: 0 };
      byYear[u.year].days += u.days;
    });

    // Category stats exclude residual value
    const byCategory: { [category: string]: number } = {};
    expenses.forEach((e) => {
      if (e.category !== "Residual Value") {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      }
    });

    return { netExpenses, grossExpenses, residualValue, totalDays, costPerDay, byYear, byCategory };
  }

  const stats = calculateStats();

  const addExpenseTarget = (
    <AddExpenseForm
      onAdd={async (expense) => {
        const newExpenses = [...expenses, expense];
        setExpenses(newExpenses);
        await saveData(newExpenses, usageDays);
        void showToast(Toast.Style.Success, "Expense added");
      }}
    />
  );

  const addUsageDaysTarget = (
    <AddUsageDaysForm
      onAdd={async (usage) => {
        const existing = usageDays.find((u) => u.year === usage.year);
        const newUsageDays = existing
          ? usageDays.map((u) => (u.year === usage.year ? usage : u))
          : [...usageDays, usage];
        setUsageDays(newUsageDays);
        await saveData(expenses, newUsageDays);
        void showToast(Toast.Style.Success, "Usage days saved");
      }}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search expenses...">
      <List.Section title="➕ Add Data">
        <List.Item
          title="Add New Expense"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action.Push title="Add Expense" icon={Icon.Plus} target={addExpenseTarget} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Add Usage Days"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push title="Add Usage Days" icon={Icon.Plus} target={addUsageDaysTarget} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📊 Profitability">
        <List.Item
          title="Gross Expenses"
          subtitle="All costs excluding residual value"
          accessories={[
            {
              text: `${stats.grossExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: { source: Icon.BankNote, tintColor: Color.Orange },
            },
          ]}
        />
        <List.Item
          title="Residual Value"
          subtitle="Current or expected resale value"
          accessories={[
            {
              text: `− ${stats.residualValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: { source: Icon.Minus, tintColor: Color.Green },
            },
          ]}
        />
        <List.Item
          title="Net Depreciation"
          subtitle="True cost (Gross − Residual Value)"
          accessories={[
            {
              text: `${stats.netExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              icon: { source: Icon.Calculator, tintColor: Color.Red },
            },
          ]}
        />
        <List.Item
          title="Total Usage Days"
          accessories={[
            {
              text: `${stats.totalDays} days`,
              icon: { source: Icon.Calendar, tintColor: Color.Blue },
            },
          ]}
        />
        <List.Item
          title="Cost per Day"
          accessories={[
            {
              text:
                stats.totalDays > 0
                  ? `${stats.costPerDay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / day`
                  : "—",
              icon: { source: Icon.Calculator, tintColor: Color.Green },
            },
          ]}
        />
      </List.Section>

      <List.Section title="📂 By Category">
        {Object.entries(stats.byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => {
            const percentage = stats.grossExpenses > 0 ? (amount / stats.grossExpenses) * 100 : 0;
            return (
              <List.Item
                key={category}
                title={category}
                accessories={[
                  {
                    text: `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    tooltip: `${percentage.toFixed(1)}% of total`,
                  },
                ]}
              />
            );
          })}
      </List.Section>

      <List.Section title="📅 Yearly Overview">
        {Object.keys(stats.byYear)
          .sort((a, b) => Number(b) - Number(a))
          .map((year) => {
            const yearData = stats.byYear[Number(year)];
            const yearCostPerDay = yearData.days > 0 ? yearData.expenses / yearData.days : 0;
            return (
              <List.Item
                key={year}
                title={`${year}`}
                subtitle={`${yearData.expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} • ${yearData.days} days`}
                accessories={[
                  {
                    text:
                      yearData.days > 0
                        ? `${yearCostPerDay.toLocaleString(undefined, { minimumFractionDigits: 2 })} / day`
                        : "No usage",
                  },
                ]}
              />
            );
          })}
        {Object.keys(stats.byYear).length === 0 && (
          <List.Item title="No data yet" subtitle="Add expenses and usage days to get started" icon={Icon.Info} />
        )}
      </List.Section>

      <List.Section title="💰 Expenses">
        {expenses
          .sort((a, b) => b.year - a.year || a.category.localeCompare(b.category))
          .map((expense) => (
            <List.Item
              key={expense.id}
              title={expense.description}
              subtitle={`${expense.year} • ${expense.category}`}
              accessories={[
                {
                  text: `${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={
                      <EditExpenseForm
                        expense={expense}
                        onSave={async (updated) => {
                          const newExpenses = expenses.map((e) => (e.id === updated.id ? updated : e));
                          setExpenses(newExpenses);
                          await saveData(newExpenses, usageDays);
                          void showToast(Toast.Style.Success, "Expense updated");
                        }}
                      />
                    }
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteExpense(expense.id)}
                  />
                  <Action.Push
                    title="New Expense"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={addExpenseTarget}
                  />
                </ActionPanel>
              }
            />
          ))}
        <List.Item
          title="Add New Expense"
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action.Push title="Add Expense" icon={Icon.Plus} target={addExpenseTarget} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📆 Usage Days per Year">
        {usageDays
          .sort((a, b) => b.year - a.year)
          .map((usage) => (
            <List.Item
              key={usage.year}
              title={`${usage.year}`}
              accessories={[{ text: `${usage.days} days` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit"
                    icon={Icon.Pencil}
                    target={
                      <EditUsageDaysForm
                        usageDays={usage}
                        onSave={async (updated) => {
                          const newUsageDays = usageDays.map((u) => (u.year === usage.year ? updated : u));
                          setUsageDays(newUsageDays);
                          await saveData(expenses, newUsageDays);
                          void showToast(Toast.Style.Success, "Usage days updated");
                        }}
                      />
                    }
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => deleteUsageDays(usage.year)}
                  />
                  <Action.Push
                    title="New Usage Days"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    target={addUsageDaysTarget}
                  />
                </ActionPanel>
              }
            />
          ))}
        <List.Item
          title="Add Usage Days"
          icon={{ source: Icon.Plus, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action.Push title="Add Usage Days" icon={Icon.Plus} target={addUsageDaysTarget} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="⚙️ Actions">
        <List.Item
          title="Export CSV"
          subtitle="For Numbers / Excel (clipboard)"
          icon={{ source: Icon.Document, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action title="Export CSV" icon={Icon.Document} onAction={exportCSV} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Export JSON"
          subtitle="Full data backup"
          icon={{ source: Icon.Download, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action title="Export JSON" icon={Icon.Download} onAction={exportData} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Import JSON"
          subtitle="Restore data from clipboard"
          icon={{ source: Icon.Upload, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action title="Import JSON" icon={Icon.Upload} onAction={importData} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Delete All Data"
          subtitle="Reset to initial state"
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action
                title="Delete All Data"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={resetAllData}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function AddExpenseForm({ onAdd }: { onAdd: (expense: Expense) => void }) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; category: string; description: string; amount: string }) {
    const yearNum = parseInt(values.year);
    const amountNum = parseFloat(values.amount.replace(",", "."));

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Please enter a valid year (1900–2100)");
      return;
    }
    const isResidual = values.category === "Residual Value";
    if (isNaN(amountNum) || (!isResidual && amountNum <= 0) || amountNum < 0) {
      setAmountError(
        isResidual ? "Please enter a valid amount (0 or greater)" : "Please enter a valid amount (greater than 0)",
      );
      return;
    }

    const expense: Expense = {
      id: crypto.randomUUID(),
      year: yearNum,
      category: values.category,
      description: values.description,
      amount: amountNum,
    };
    onAdd(expense);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Expense" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Year"
        placeholder="2025"
        defaultValue={new Date().getFullYear().toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.Dropdown id="category" title="Category" defaultValue={CATEGORIES[0]}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="description" title="Description" placeholder="e.g. Winter tires" />
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="1250"
        info="Number without currency symbol, e.g. 1250 or 1250.50"
        error={amountError}
        onChange={() => setAmountError(undefined)}
      />
    </Form>
  );
}

function EditExpenseForm({ expense, onSave }: { expense: Expense; onSave: (expense: Expense) => void }) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [amountError, setAmountError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; category: string; description: string; amount: string }) {
    const yearNum = parseInt(values.year);
    const amountNum = parseFloat(values.amount.replace(",", "."));

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Please enter a valid year (1900–2100)");
      return;
    }
    const isResidual = values.category === "Residual Value";
    if (isNaN(amountNum) || (!isResidual && amountNum <= 0) || amountNum < 0) {
      setAmountError(
        isResidual ? "Please enter a valid amount (0 or greater)" : "Please enter a valid amount (greater than 0)",
      );
      return;
    }

    const updated: Expense = {
      ...expense,
      year: yearNum,
      category: values.category,
      description: values.description,
      amount: amountNum,
    };
    onSave(updated);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Year"
        defaultValue={expense.year.toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.Dropdown id="category" title="Category" defaultValue={expense.category}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="description" title="Description" defaultValue={expense.description} />
      <Form.TextField
        id="amount"
        title="Amount"
        defaultValue={expense.amount.toString()}
        info="Number without currency symbol, e.g. 1250 or 1250.50"
        error={amountError}
        onChange={() => setAmountError(undefined)}
      />
    </Form>
  );
}

function AddUsageDaysForm({ onAdd }: { onAdd: (usage: UsageDays) => void }) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [daysError, setDaysError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; days: string }) {
    const yearNum = parseInt(values.year);
    const daysNum = parseInt(values.days);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Please enter a valid year (1900–2100)");
      return;
    }
    if (isNaN(daysNum) || daysNum < 0 || daysNum > 366) {
      setDaysError("Please enter a valid number of days (0–366)");
      return;
    }

    onAdd({ year: yearNum, days: daysNum });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Usage Days" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Year"
        placeholder="2025"
        defaultValue={new Date().getFullYear().toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.TextField
        id="days"
        title="Usage Days"
        placeholder="30"
        error={daysError}
        onChange={() => setDaysError(undefined)}
      />
    </Form>
  );
}

function EditUsageDaysForm({ usageDays, onSave }: { usageDays: UsageDays; onSave: (usage: UsageDays) => void }) {
  const [yearError, setYearError] = useState<string | undefined>();
  const [daysError, setDaysError] = useState<string | undefined>();

  function handleSubmit(values: { year: string; days: string }) {
    const yearNum = parseInt(values.year);
    const daysNum = parseInt(values.days);

    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setYearError("Please enter a valid year (1900–2100)");
      return;
    }
    if (isNaN(daysNum) || daysNum < 0 || daysNum > 366) {
      setDaysError("Please enter a valid number of days (0–366)");
      return;
    }

    onSave({ year: yearNum, days: daysNum });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="year"
        title="Year"
        defaultValue={usageDays.year.toString()}
        error={yearError}
        onChange={() => setYearError(undefined)}
      />
      <Form.TextField
        id="days"
        title="Usage Days"
        defaultValue={usageDays.days.toString()}
        error={daysError}
        onChange={() => setDaysError(undefined)}
      />
    </Form>
  );
}
