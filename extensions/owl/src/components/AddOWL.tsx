import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useMemo, useState } from "react";
import { useKeyboards } from "../hooks/keyboards";
import { useCachedStorage } from "../hooks/storage";
import { OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";
import { lengthLocaleCompare } from "../utils/keyboards";
import ViewKeyboard from "./ViewKeyboard";

type AddOWLValues = {
  from: string;
  to: string;
};

export function AddOWL(props: Readonly<{ base?: string }>) {
  const { base } = props;

  const { keyboards } = useKeyboards();
  const [, setOWLs] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});

  const fromOptions = useMemo(() => {
    return keyboards
      .filter((keyboard) => base == null || base === "" || keyboard.includes(base))
      .toSorted((a, b) => {
        if (a.replace(base ?? "", "").length === 0 || b.replace(base ?? "", "").length === 0) {
          return a.length - b.length;
        }

        return a.localeCompare(b);
      });
  }, [base, keyboards]);

  const [from, setFrom] = useState<string>(base ? (fromOptions?.[0] ?? "") : "");
  const [to, setTo] = useState<string>("");

  const { push, pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<AddOWLValues>
            title={"Add Owl"}
            onSubmit={async (values) => {
              setOWLs((previousState) => ({
                ...previousState,
                [values.from]: [
                  ...(previousState[values.from] ?? []),
                  {
                    id: randomUUID(),
                    from: values.from,
                    to: values.to,
                    history: [],
                  },
                ],
              }));

              showToast({
                style: Toast.Style.Success,
                title: "OWL Added",
                message: `${values.from} -> ${values.to}`,
              }).then(() => {
                pop();
              });
            }}
          />
          <Action
            title={"View Input Keyboard"}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "i",
            }}
            onAction={() => {
              push(<ViewKeyboard keyboard={from} />);
            }}
          />
          <Action
            title={"View Output Keyboard"}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "o",
            }}
            onAction={() => {
              push(<ViewKeyboard keyboard={to} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id={"from"} title={"From"} value={from} onChange={setFrom}>
        <Form.Dropdown.Section title={"Suggested"}>
          {fromOptions.toSorted(lengthLocaleCompare).map((keyboard) => {
            return <Form.Dropdown.Item key={keyboard} value={keyboard} title={keyboard} />;
          })}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title={"All"}>
          {keyboards
            .filter((keyboard) => !fromOptions.includes(keyboard))
            .toSorted(lengthLocaleCompare)
            .map((keyboard) => {
              return <Form.Dropdown.Item key={keyboard} value={keyboard} title={keyboard} />;
            })}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Dropdown id={"to"} title={"To"} value={to} onChange={setTo}>
        {keyboards
          .filter((keyboard) => {
            return keyboard !== from;
          })
          .toSorted(lengthLocaleCompare)
          .map((keyboard) => {
            return <Form.Dropdown.Item key={keyboard} value={keyboard} title={keyboard} />;
          })}
      </Form.Dropdown>
    </Form>
  );
}
