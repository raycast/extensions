import { ActionPanel, List, Action, Clipboard, showToast, Toast, Icon, Form } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4, v1 as uuidv1, v3 as uuidv3, v5 as uuidv5 } from "uuid";

interface UuidHistory {
  uuid: string;
  version: string;
  timestamp: Date;
  format: string;
}

interface InputFormProps {
  defaultValue: string;
  onSubmit: (value: string) => void;
  title: string;
}

function InputForm({ defaultValue, onSubmit, title }: InputFormProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={() => onSubmit(value)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="value" title={title} value={value} onChange={setValue} autoFocus />
    </Form>
  );
}

export default function UuidGenerator() {
  const [version, setVersion] = useState<"v1" | "v3" | "v4" | "v5">("v4");
  const [format, setFormat] = useState<"standard" | "simple" | "base64" | "uppercase">("standard");
  const [namespace, setNamespace] = useState("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  const [name, setName] = useState("example.com");
  const [history, setHistory] = useState<UuidHistory[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showNamespaceForm, setShowNamespaceForm] = useState(false);
  const [showNameForm, setShowNameForm] = useState(false);

  const formatUuid = (uuid: string, format: string): string => {
    switch (format) {
      case "simple":
        return uuid.replace(/-/g, "");
      case "base64":
        return Buffer.from(uuid.replace(/-/g, ""), "hex").toString("base64");
      case "uppercase":
        return uuid.toUpperCase();
      default:
        return uuid;
    }
  };

  const generateUuid = (): string => {
    switch (version) {
      case "v1":
        return uuidv1();
      case "v3":
        return uuidv3(name, namespace);
      case "v4":
        return uuidv4();
      case "v5":
        return uuidv5(name, namespace);
      default:
        return uuidv4();
    }
  };

  const generateMultiple = () => {
    const newUuids = Array.from({ length: quantity }, () => {
      const uuid = generateUuid();
      const formattedUuid = formatUuid(uuid, format);
      return {
        uuid: formattedUuid,
        version,
        timestamp: new Date(),
        format,
      };
    });

    setHistory((prev) => [...newUuids, ...prev].slice(0, 50));
  };

  const copyAll = () => {
    const allUuids = history.map((h) => h.uuid).join("\n");
    Clipboard.copy(allUuids);
    showToast({ style: Toast.Style.Success, title: "All UUIDs copied!" });
  };

  if (showNamespaceForm) {
    return (
      <InputForm
        title="Enter Custom Namespace"
        defaultValue={namespace}
        onSubmit={(value) => {
          try {
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
              throw new Error("Invalid UUID format");
            }
            setNamespace(value);
            setShowNamespaceForm(false);
            showToast({ style: Toast.Style.Success, title: "Namespace updated!" });
          } catch (error) {
            showToast({
              style: Toast.Style.Failure,
              title: "Invalid namespace",
              message: "Please enter a valid UUID",
            });
          }
        }}
      />
    );
  }

  if (showNameForm) {
    return (
      <InputForm
        title="Enter Custom Name"
        defaultValue={name}
        onSubmit={(value) => {
          if (value.trim()) {
            setName(value.trim());
            setShowNameForm(false);
            showToast({ style: Toast.Style.Success, title: "Name updated!" });
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: "Invalid name",
              message: "Name cannot be empty",
            });
          }
        }}
      />
    );
  }

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Number of UUIDs" onChange={(value) => setQuantity(parseInt(value))}>
          {[1, 5, 10, 20, 50, 100].map((num) => (
            <List.Dropdown.Item key={num} title={`Generate ${num}`} value={num.toString()} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Settings">
        <List.Item
          title="UUID Version"
          subtitle={version.toUpperCase()}
          actions={
            <ActionPanel>
              <Action
                title="Version 1 (time-based)"
                onAction={() => setVersion("v1")}
                shortcut={{ modifiers: ["cmd"], key: "1" }}
              />
              <Action
                title="Version 3 (md5 + Namespace)"
                onAction={() => setVersion("v3")}
                shortcut={{ modifiers: ["cmd"], key: "3" }}
              />
              <Action
                title="Version 4 (random)"
                onAction={() => setVersion("v4")}
                shortcut={{ modifiers: ["cmd"], key: "4" }}
              />
              <Action
                title="Version 5 (sha-1 + Namespace)"
                onAction={() => setVersion("v5")}
                shortcut={{ modifiers: ["cmd"], key: "5" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Output Format"
          subtitle={format.charAt(0).toUpperCase() + format.slice(1)}
          actions={
            <ActionPanel>
              <Action
                title="Standard"
                onAction={() => setFormat("standard")}
                shortcut={{ modifiers: ["cmd", "opt"], key: "1" }}
              />
              <Action
                title="Simple (no Dashes)"
                onAction={() => setFormat("simple")}
                shortcut={{ modifiers: ["cmd", "opt"], key: "2" }}
              />
              <Action
                title="Base64"
                onAction={() => setFormat("base64")}
                shortcut={{ modifiers: ["cmd", "opt"], key: "3" }}
              />
              <Action
                title="Uppercase"
                onAction={() => setFormat("uppercase")}
                shortcut={{ modifiers: ["cmd", "opt"], key: "4" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {(version === "v3" || version === "v5") && (
        <List.Section title="Namespace & Name">
          <List.Item
            title="Namespace"
            subtitle={namespace}
            accessories={[{ icon: Icon.Pencil }]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Namespace"
                  onAction={() => setShowNamespaceForm(true)}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "1" }}
                />
                <Action
                  title="Reset to Dns Default"
                  onAction={() => {
                    setNamespace("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
                    showToast({ style: Toast.Style.Success, title: "Namespace reset" });
                  }}
                  icon={Icon.ArrowClockwise}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Name"
            subtitle={name}
            accessories={[{ icon: Icon.Pencil }]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Name"
                  onAction={() => setShowNameForm(true)}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "2" }}
                />
                <Action
                  title="Reset to Default"
                  onAction={() => {
                    setName("example.com");
                    showToast({ style: Toast.Style.Success, title: "Name reset" });
                  }}
                  icon={Icon.ArrowClockwise}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Generated UUIDs" subtitle={`${history.length} items`}>
        <List.Item
          title="Generate New UUIDs"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Generate" onAction={generateMultiple} />
              <Action title="Copy All" onAction={copyAll} />
              <Action
                title={showHistory ? "Hide History" : "Show History"}
                onAction={() => setShowHistory(!showHistory)}
              />
              <Action title="Clear History" onAction={() => setHistory([])} />
            </ActionPanel>
          }
        />

        {showHistory &&
          history.map((item, index) => (
            <List.Item
              key={index}
              title={item.uuid}
              subtitle={`Generated at ${item.timestamp.toLocaleTimeString()}`}
              accessories={[{ text: `Version ${item.version}` }, { text: item.format }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard content={item.uuid} />
                  <Action
                    title="Remove from History"
                    onAction={() => setHistory(history.filter((_, i) => i !== index))}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
