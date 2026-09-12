import { Form, ActionPanel, Action, showToast, Toast, Clipboard, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";

interface TimeEntry {
  id: string;
  value: string;
  minutes: number | null;
  isValid: boolean;
  errorMessage?: string;
}

// Create initial empty entries
const createEmptyEntries = (count: number): TimeEntry[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `entry-${Date.now()}-${index}`,
    value: "",
    minutes: null,
    isValid: true,
  }));
};

export default function CalculateTime() {
  const [entries, setEntries] = useState<TimeEntry[]>(createEmptyEntries(10));
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

  // Reset focus after a delay
  useEffect(() => {
    if (focusedFieldId) {
      const timer = setTimeout(() => {
        setFocusedFieldId(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [focusedFieldId]);

  // Parse time input and return minutes
  const parseTimeInput = (input: string): { minutes: number | null; isValid: boolean; errorMessage?: string } => {
    if (!input.trim()) {
      return { minutes: null, isValid: true };
    }

    // Check if it's time format (contains :)
    if (input.includes(":")) {
      const parts = input.split(":");
      if (parts.length !== 2) {
        return { minutes: null, isValid: false, errorMessage: "Invalid format. Use HH:MM" };
      }

      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      if (isNaN(hours) || isNaN(minutes)) {
        return { minutes: null, isValid: false, errorMessage: "Invalid time values" };
      }

      if (hours < 0) {
        return { minutes: null, isValid: false, errorMessage: "Hours cannot be negative" };
      }

      if (minutes < 0 || minutes > 59) {
        return { minutes: null, isValid: false, errorMessage: "Minutes must be between 0-59" };
      }

      return { minutes: hours * 60 + minutes, isValid: true };
    }

    // Decimal format
    const decimal = parseFloat(input);
    if (isNaN(decimal)) {
      return { minutes: null, isValid: false, errorMessage: "Invalid decimal format" };
    }

    if (decimal < 0) {
      return { minutes: null, isValid: false, errorMessage: "Time cannot be negative" };
    }

    return { minutes: Math.round(decimal * 60), isValid: true };
  };

  // Format minutes to HH:MM
  const formatTimeDisplay = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Format minutes to decimal
  const formatDecimalDisplay = (totalMinutes: number): string => {
    return (totalMinutes / 60).toFixed(3);
  };

  // Handle input change
  const handleInputChange = (id: string, value: string) => {
    // Check if input is 4 digits (e.g., "0300", "1430")
    const fourDigitPattern = /^(\d{4})$/;
    const match = value.match(fourDigitPattern);

    if (match) {
      // Auto-format to HH:MM
      const digits = match[1];
      const hours = digits.substring(0, 2);
      const minutes = digits.substring(2, 4);
      const formattedValue = `${hours}:${minutes}`;

      // Update the current entry
      setEntries((prev) => {
        const currentIndex = prev.findIndex((e) => e.id === id);
        const isLastEntry = currentIndex === prev.length - 1;

        // If this is the last entry and it's not empty, add a new row
        if (isLastEntry && value.trim()) {
          const newEntries = [...prev, ...createEmptyEntries(1)];
          return newEntries.map((entry) => {
            if (entry.id !== id) return entry;

            const parsed = parseTimeInput(formattedValue);
            return {
              ...entry,
              value: formattedValue,
              minutes: parsed.minutes,
              isValid: parsed.isValid,
              errorMessage: parsed.errorMessage,
            };
          });
        }

        return prev.map((entry) => {
          if (entry.id !== id) return entry;

          const parsed = parseTimeInput(formattedValue);
          return {
            ...entry,
            value: formattedValue,
            minutes: parsed.minutes,
            isValid: parsed.isValid,
            errorMessage: parsed.errorMessage,
          };
        });
      });

      // Set focus to the next field
      setEntries((prev) => {
        const currentIndex = prev.findIndex((e) => e.id === id);
        if (currentIndex < prev.length - 1) {
          const nextId = prev[currentIndex + 1].id;
          setFocusedFieldId(nextId);
        }
        return prev;
      });

      return;
    }

    // Normal update for non-4-digit inputs
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;

        const parsed = parseTimeInput(value);
        return {
          ...entry,
          value,
          minutes: parsed.minutes,
          isValid: parsed.isValid,
          errorMessage: parsed.errorMessage,
        };
      })
    );
  };

  // Calculate total minutes
  const totalMinutes = useMemo(() => {
    return entries.reduce((sum, entry) => {
      return sum + (entry.minutes || 0);
    }, 0);
  }, [entries]);

  // Add more lines
  const handleAddMoreLines = () => {
    setEntries((prev) => [...prev, ...createEmptyEntries(5)]);
    showToast({
      style: Toast.Style.Success,
      title: "Added 5 more lines",
    });
  };

  // Clear all entries
  const handleClear = () => {
    setEntries(createEmptyEntries(10));
    showToast({
      style: Toast.Style.Success,
      title: "Cleared all entries",
    });
  };

  // Copy total to clipboard
  const handleCopyTotal = async () => {
    try {
      const timeFormat = formatTimeDisplay(totalMinutes);
      const decimalFormat = formatDecimalDisplay(totalMinutes);
      const clipboardContent = `Total: ${timeFormat} (${decimalFormat} hours)`;

      await Clipboard.copy(clipboardContent);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
        message: clipboardContent,
      });
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to copy to clipboard",
      });
    }
  };

  return (
    <Form
      navigationTitle="Time Calculator"
      actions={
        <ActionPanel>
          <Action
            title="Copy Total"
            icon={Icon.CopyClipboard}
            onAction={handleCopyTotal}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Add More Lines"
            icon={Icon.Plus}
            onAction={handleAddMoreLines}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          <Action
            title="Clear All"
            icon={Icon.Trash}
            onAction={handleClear}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Total Time"
        text={`${formatTimeDisplay(totalMinutes)} (${formatDecimalDisplay(totalMinutes)} hours)`}
      />

      <Form.Description text="💡 Tip: Type 4 digits (e.g., 0830) to auto-format to HH:MM and jump to next line" />

      <Form.Separator />

      {entries.map((entry, index) => (
        <Form.TextField
          key={entry.id}
          id={entry.id}
          title={`Entry ${index + 1}`}
          placeholder="e.g., 8:30 or 8.5 or 0830"
          value={entry.value}
          error={entry.isValid ? undefined : entry.errorMessage}
          onChange={(value) => handleInputChange(entry.id, value)}
          storeValue={false}
          autoFocus={focusedFieldId === entry.id || (index === 0 && !focusedFieldId)}
          onFocus={() => setFocusedFieldId(entry.id)}
        />
      ))}
    </Form>
  );
}
