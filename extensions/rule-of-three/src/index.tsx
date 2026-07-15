// index.tsx
import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import Details from "./details";

export default function Command() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const [x, setX] = useState<string>("");

  // Calculate X in real-time whenever inputs change
  useEffect(() => {
    const aNum = parseFloat(a);
    const bNum = parseFloat(b);
    const cNum = parseFloat(c);

    if (!isNaN(aNum) && !isNaN(bNum) && !isNaN(cNum) && aNum !== 0) {
      const result = (cNum * bNum) / aNum;
      setX(result.toString());
    } else {
      setX("");
    }
  }, [a, b, c]);

  async function copyX() {
    if (x) {
      await Clipboard.copy(x);
      showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: x,
      });
    }
  }

  function swapAB() {
    const temp = a;
    setA(b);
    setB(temp);
    showToast({
      style: Toast.Style.Success,
      title: "Swapped",
      message: "A ↔ B",
    });
  }

  function swapCX() {
    if (x) {
      setC(x);
      showToast({
        style: Toast.Style.Success,
        title: "Swapped",
        message: "C ↔ X",
      });
    }
  }

  function swapCA() {
    const temp = c;
    setC(a);
    setA(temp);
    showToast({
      style: Toast.Style.Success,
      title: "Swapped",
      message: "C ↔ A",
    });
  }

  const renderActions = () => {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Info">
          <Action.Push
            title="Show Illustration"
            icon={Icon.Book}
            target={<Details a={a} b={b} c={c} x={x} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Actions">
          {x && (
            <Action title="Copy X" icon={Icon.Clipboard} onAction={copyX} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          )}
          <Action
            title="Swap a ↔ B"
            icon={Icon.Switch}
            onAction={swapAB}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Swap C ↔ a"
            icon={Icon.Switch}
            onAction={swapCA}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
          />
          {x && (
            <Action
              title="Swap C ↔ X"
              icon={Icon.Switch}
              onAction={swapCX}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
            />
          )}
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const proportionText = x ? `${a} is to ${b} as ${c} is to ${x}` : "Enter values to calculate";

  return (
    <Form actions={renderActions()}>
      <Form.Description title="Rule of Three" text={proportionText} />
      <Form.Separator />
      <Form.TextField
        id="a"
        title="A"
        placeholder="1920"
        value={a}
        onChange={setA}
        info="First value in the proportion"
      />
      <Form.TextField
        id="b"
        title="B"
        placeholder="1080"
        value={b}
        onChange={setB}
        info="Second value in the proportion"
      />
      <Form.Separator />
      <Form.TextField
        id="c"
        title="C"
        placeholder="960"
        value={c}
        onChange={setC}
        info="Third value in the proportion"
      />
      <Form.Description title="X (Result)" text={x || "Waiting for input..."} />
      {x && (
        <>
          <Form.Separator />
          <Form.Description title="Formula" text={`X = (C × B) ÷ A = (${c} × ${b}) ÷ ${a} = ${x}`} />
        </>
      )}
    </Form>
  );
}
