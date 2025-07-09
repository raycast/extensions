import { useState, useEffect } from "react";
import {
  Form,
  LaunchProps,
  Clipboard,
  showToast,
  Toast,
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
} from "@raycast/api";

/**
 * Interface defining the command arguments passed to the extension
 */
interface Arguments {
  /** The number to be rounded */
  roundValue: string;
  /** The nearest value to round to */
  nearestValue: string;
}

/**
 * Interface defining the user preferences
 */
interface Preferences {
  copyToClipboard: boolean;
}

/**
 * A Raycast command that rounds a number to the nearest specified value.
 * For example, rounding 127 to the nearest 50 would give 150.
 *
 * @param props - The launch properties containing command arguments
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();

  const [roundValue, setRoundValue] = useState(props.arguments.roundValue);
  const [nearestValue, setNearestValue] = useState(
    props.arguments.nearestValue,
  );
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Rounds a number to the nearest multiple of another number
   *
   * @param roundNum - The number to round
   * @param nearestNum - The number to round to (must not be zero)
   * @returns The rounded number
   */
  function roundToNearest(roundNum: number, nearestNum: number): number {
    return Math.round(roundNum / nearestNum) * nearestNum;
  }

  /**
   * Performs the initial calculation when the component mounts
   */
  useEffect(() => {
    handleCalculate(roundValue, nearestValue);
  }, []);

  /**
   * Handles the calculation logic, validates inputs, updates state, and shows toast notifications
   *
   * @param roundStr - The string value to be rounded
   * @param nearestStr - The string value to round to
   */
  async function handleCalculate(roundStr: string, nearestStr: string) {
    const num1 = Number(roundStr);
    const num2 = Number(nearestStr);

    if (isNaN(num1) || isNaN(num2)) {
      setError("Please provide valid numbers for both inputs.");
      setResult(null);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Please provide valid numbers for both inputs.",
      });
      return;
    }
    if (num2 === 0) {
      setError("Nearest number must not be zero.");
      setResult(null);
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Nearest number must not be zero.",
      });
      return;
    }

    const rounded = roundToNearest(num1, num2);
    setResult(rounded);
    setError(null);

    if (preferences.copyToClipboard) {
      await Clipboard.copy(rounded.toString());
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Rounded!",
      message: `Result ${rounded} ${
        preferences.copyToClipboard ? "copied to clipboard." : ""
      }`,
    });
  }

  /**
   * Handles form submission, performs validation, calculation, and updates the UI
   */
  async function handleSubmit() {
    const num1 = Number(roundValue);
    const num2 = Number(nearestValue);

    if (isNaN(num1) || isNaN(num2)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Please enter valid numbers for both fields.",
      });
      setResult(null);
      setError("Please enter valid numbers for both fields.");
      return;
    }
    if (num2 === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Nearest number must not be zero.",
      });
      setResult(null);
      setError("Nearest number must not be zero.");
      return;
    }

    const rounded = roundToNearest(num1, num2);
    setResult(rounded);
    setError(null);

    if (preferences.copyToClipboard) {
      await Clipboard.copy(rounded.toString());
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Rounded!",
      message: `Result ${rounded} ${
        preferences.copyToClipboard ? "copied to clipboard." : ""
      }`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Recalculate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="roundValue"
        title="Round"
        value={roundValue}
        onChange={setRoundValue}
      />
      <Form.TextField
        id="nearestValue"
        title="To the nearest"
        value={nearestValue}
        onChange={setNearestValue}
      />
      
      <Form.Separator />
      
      {error && (
        <Form.Description title="Error" text={error} />
      )}
      {result !== null && !error && (
        <Form.Description title="Result" text={result.toString()} />
      )}
    </Form>
  );
}
