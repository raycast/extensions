import { Icon, Form } from "@raycast/api";
import { nanoid, ulid, uuidV4, uuidV7 } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

type Kind = "uuidv4" | "uuidv7" | "ulid" | "nanoid";

export default function Command() {
  return (
    <InputForm
      inputTitle="Count (1-50)"
      placeholder="10"
      extraFields={({ setValue }) => (
        <Form.Dropdown id="kind" title="Type" defaultValue="uuidv4" storeValue onChange={(v) => setValue("kind", v)}>
          <Form.Dropdown.Item title="UUID v4 (random)" value="uuidv4" icon={Icon.Fingerprint} />
          <Form.Dropdown.Item title="UUID v7 (time-ordered)" value="uuidv7" icon={Icon.Clock} />
          <Form.Dropdown.Item title="ULID (time-ordered)" value="ulid" icon={Icon.Calendar} />
          <Form.Dropdown.Item title="NanoID (short ID)" value="nanoid" icon={Icon.Bolt} />
        </Form.Dropdown>
      )}
      compute={(values) => {
        const count = Math.max(1, Math.min(50, Number((values.input ?? "10").trim()) || 10));
        const kind = (values.kind as Kind) ?? "uuidv4";
        const label: Record<Kind, string> = {
          uuidv4: "UUID v4",
          uuidv7: "UUID v7",
          ulid: "ULID",
          nanoid: "NanoID",
        };
        return Array.from({ length: count }, (_, index) => {
          const value =
            kind === "uuidv4" ? uuidV4() : kind === "uuidv7" ? uuidV7() : kind === "ulid" ? ulid() : nanoid();
          return {
            id: `${kind}-${index}`,
            title: value,
            subtitle: `${label[kind]} #${index + 1}`,
            icon: Icon.Fingerprint,
            copyValue: value,
          } as ResultRow;
        });
      }}
    />
  );
}
