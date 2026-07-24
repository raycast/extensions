import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  verifyAndUnlock,
  getPinHint,
  getSessionTimeRemaining,
} from "../lib/pin";

interface PinEntryFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
  noteTitle?: string;
}

/**
 * PIN Entry Form for unlocking protected notes
 * Used when accessing a protected note that requires PIN verification
 */
export function PinEntryForm({
  onSuccess,
  onCancel,
  noteTitle,
}: PinEntryFormProps) {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Load PIN hint on mount
  useEffect(() => {
    getPinHint().then(setHint);
  }, []);

  const handleSubmit = async () => {
    if (!pin) {
      setError("Please enter your PIN");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyAndUnlock(pin);

      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: "PIN Verified",
          message: "Protected notes are now accessible",
        });
        onSuccess();
      } else {
        setAttempts((prev) => prev + 1);
        setError(result.error || "Incorrect PIN");
        setPin("");

        // Show warning after 3 failed attempts
        if (attempts >= 2) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Multiple Failed Attempts",
            message: "Please check your PIN and try again",
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify PIN");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Enter PIN"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Unlock"
            icon={Icon.LockUnlocked}
            onSubmit={handleSubmit}
          />
          {onCancel && (
            <Action
              title="Cancel"
              icon={Icon.XMarkCircle}
              onAction={onCancel}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Protected Note"
        text={
          noteTitle
            ? `"${noteTitle}" is PIN-protected.`
            : "This note is PIN-protected."
        }
      />

      <Form.PasswordField
        id="pin"
        title="PIN"
        placeholder="Enter your PIN"
        value={pin}
        onChange={(value) => {
          setPin(value);
          setError(null);
        }}
        autoFocus
        error={error || undefined}
      />

      {hint && <Form.Description title="Hint" text={hint} />}

      {attempts > 0 && (
        <Form.Description
          title="Attempts"
          text={`${attempts} failed attempt${attempts !== 1 ? "s" : ""}`}
        />
      )}

      <Form.Description
        title=""
        text="Your PIN unlocks all protected notes for 15 minutes."
      />
    </Form>
  );
}

interface PinStatusProps {
  children: React.ReactNode;
  noteId: string;
  isProtected: boolean;
  noteTitle?: string;
}

/**
 * PIN Status wrapper component
 * Checks if PIN session is active and shows PIN form if needed
 */
export function PinGate({
  children,
  noteId,
  isProtected,
  noteTitle,
}: PinStatusProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isProtected) {
      setIsUnlocked(true);
      setIsChecking(false);
      return;
    }

    // Check if PIN session is active
    getSessionTimeRemaining().then((remaining) => {
      setIsUnlocked(remaining !== null && remaining > 0);
      setIsChecking(false);
    });
  }, [isProtected, noteId]);

  if (isChecking) {
    return null; // or loading state
  }

  if (!isProtected || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <PinEntryForm noteTitle={noteTitle} onSuccess={() => setIsUnlocked(true)} />
  );
}
