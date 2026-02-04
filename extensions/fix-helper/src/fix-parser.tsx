import {
  Action,
  ActionPanel,
  Form,
  List,
  useNavigation,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
  getSelectedText,
  Clipboard,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { FIX_SPECS } from "./specs";
import { getOnixsUrl, formatFixTimestamp, getTagIcon, getTagColor, getFixMessageSummary } from "./utils";
import { TAGS, HEADER_TAGS, TRAILER_TAGS, MSG_TYPE } from "./constants";
import { TagDetail, TagItem } from "./TagDetail";

interface ParsedField {
  tag: number;
  name: string;
  value: string;
  description?: string;
  type?: string;
}

function parseFixMessage(
  message: string,
  defaultVersion: string,
  customDelimiter?: string,
): { fields: ParsedField[]; version: string } {
  // Normalize <SOH> to |
  const normalizedMessage = message.replace(/<SOH>/gi, "|");

  // Detect delimiter
  // Look for standard header 8=FIX.x.x(delimiter)
  const headerMatch = normalizedMessage.match(/^8=FIX\.\d\.\w+(.)/);
  let delimiter = "|"; // Default fallback

  if (customDelimiter && normalizedMessage.includes(customDelimiter)) {
    delimiter = customDelimiter;
  } else if (headerMatch) {
    delimiter = headerMatch[1];
  } else {
    // Fallback heuristics if header is missing or malformed
    if (normalizedMessage.includes("\x01")) delimiter = "\x01";
    else if (normalizedMessage.includes("|")) delimiter = "|";
    else if (normalizedMessage.includes("^")) delimiter = "^";
    else if (normalizedMessage.includes("~")) delimiter = "~";
    else if (normalizedMessage.includes(";")) delimiter = ";";
    else if (normalizedMessage.includes(" ")) delimiter = " ";
  }

  const rawFields = normalizedMessage
    .split(delimiter)
    .filter((field) => field.includes("="))
    .map((field) => {
      const [tagStr, ...valueParts] = field.split("=");
      const value = valueParts.join("=");
      const tag = parseInt(tagStr, 10);
      return { tag, value };
    })
    .filter((field) => !isNaN(field.tag));

  // Detect version from Tag 8 (BeginString)
  const beginStringField = rawFields.find((f) => f.tag === TAGS.BEGIN_STRING);
  const version = beginStringField ? beginStringField.value : defaultVersion;

  // Select spec, fallback to default preference or FIX.4.4 if somehow missing
  const spec = FIX_SPECS[version] || FIX_SPECS[defaultVersion] || FIX_SPECS["FIX.4.4"];

  const fields = rawFields.map((f) => {
    const tagSpec = spec.tags[f.tag];
    const name = tagSpec ? tagSpec.name : "Unknown";
    const enumDesc = spec.enums[f.tag]?.[f.value];

    return {
      tag: f.tag,
      name,
      value: f.value,
      description: enumDesc,
      type: tagSpec?.type,
    };
  });

  return { fields, version };
}

function VersionPicker({ currentVersion, onSelect }: { currentVersion: string; onSelect: (version: string) => void }) {
  const { pop } = useNavigation();
  const versions = Object.keys(FIX_SPECS).sort();

  return (
    <List navigationTitle="Select Default FIX Version" isLoading={versions.length === 0}>
      {versions.map((v) => (
        <List.Item
          key={v}
          title={v}
          icon={v === currentVersion ? Icon.CheckCircle : Icon.Circle}
          actions={
            <ActionPanel>
              <Action
                title="Select Version"
                onAction={() => {
                  onSelect(v);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Default Version Changed",
                    message: `Now using ${v}`,
                  });
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ParsedMessageView({
  message,
  defaultVersion,
  onDefaultVersionChange,
  source,
}: {
  message: string;
  defaultVersion: string;
  onDefaultVersionChange: (v: string) => void;
  source?: string;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { fields, version } = parseFixMessage(message, defaultVersion, preferences.customDelimiter);
  const [filterType, setFilterType] = useState("all");
  const [searchText, setSearchText] = useState("");

  const filteredFields = fields.filter((f) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    const combined =
      `${f.tag} ${f.name} ${f.value} ${f.description || ""} ${f.type || ""} ${f.tag}=${f.value}`.toLowerCase();
    return combined.includes(lowerSearch);
  });

  const headerFields = filteredFields.filter((f) => HEADER_TAGS.includes(f.tag));
  const trailerFields = filteredFields.filter((f) => TRAILER_TAGS.includes(f.tag));
  const bodyFields = filteredFields.filter((f) => !HEADER_TAGS.includes(f.tag) && !TRAILER_TAGS.includes(f.tag));

  const summary = getFixMessageSummary(fields);

  const renderItem = (field: ParsedField, index: number) => {
    const accessories: List.Item.Accessory[] = [];

    if (field.description) {
      accessories.push({
        tag: { value: field.description, color: getTagColor(field.tag, field.value, version) || Color.SecondaryText },
      });
    }

    // Smart Timestamp Formatting
    if ([TAGS.SENDING_TIME, TAGS.TRANSACT_TIME, 122].includes(field.tag)) {
      const localTime = formatFixTimestamp(field.value);
      if (localTime) {
        accessories.push({ text: localTime, icon: Icon.Clock });
      }
    }

    accessories.push({ text: `Tag ${field.tag}` });

    const formattedLine = `${field.tag} (${field.name}) = ${field.value}${field.description ? ` (${field.description})` : ""}`;
    const tagItem: TagItem = {
      tag: field.tag,
      name: field.name,
      type: FIX_SPECS[version]?.tags?.[field.tag]?.type,
      enums: FIX_SPECS[version]?.enums?.[field.tag],
    };

    return (
      <List.Item
        key={index}
        icon={
          preferences.showIcons
            ? {
                source: getTagIcon(field.tag, field.value, version),
                tintColor: getTagColor(field.tag, field.value, version),
              }
            : undefined
        }
        title={field.name}
        subtitle={field.value}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Tag Details"
              icon={Icon.Sidebar}
              target={<TagDetail tag={tagItem} version={version} />}
            />
            <Action.OpenInBrowser
              title="Open in OnixS Dictionary"
              url={getOnixsUrl(version, field.tag)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
            <Action.CopyToClipboard content={field.value} title="Copy Value" />
            <Action.CopyToClipboard content={field.name} title="Copy Tag Name" />
            <Action.CopyToClipboard content={String(field.tag)} title="Copy Tag Number" />
            <Action.CopyToClipboard
              content={formattedLine}
              title="Copy Formatted Line"
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            {field.description && <Action.CopyToClipboard content={field.description} title="Copy Description" />}
            <Action.CopyToClipboard
              content={JSON.stringify(fields, null, 2)}
              title="Copy as JSON"
              shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
            />
            <Action.Push
              title="Change FIX Version"
              icon={Icon.Gear}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              target={<VersionPicker currentVersion={defaultVersion} onSelect={onDefaultVersionChange} />}
            />
          </ActionPanel>
        }
      />
    );
  };

  const title = source ? `Auto-parsed from ${source}` : `Parsed ${version} Message`;

  return (
    <List
      navigationTitle={title}
      searchBarPlaceholder="Search tags, values, or names..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Section" onChange={setFilterType}>
          <List.Dropdown.Item title="All Sections" value="all" />
          <List.Dropdown.Item title="Header" value="header" />
          <List.Dropdown.Item title="Body" value="body" />
          <List.Dropdown.Item title="Trailer" value="trailer" />
        </List.Dropdown>
      }
      isLoading={fields.length === 0}
    >
      {summary && (
        <List.Section title="Summary">
          <List.Item
            title={summary}
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={summary} title="Copy Summary" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {(filterType === "all" || filterType === "header") && (
        <List.Section title="Header">{headerFields.map(renderItem)}</List.Section>
      )}

      {(filterType === "all" || filterType === "body") && bodyFields.length > 0 && (
        <List.Section title="Body">{bodyFields.map(renderItem)}</List.Section>
      )}

      {(filterType === "all" || filterType === "trailer") && trailerFields.length > 0 && (
        <List.Section title="Trailer">{trailerFields.map(renderItem)}</List.Section>
      )}
    </List>
  );
}

function splitFixMessages(input: string, customDelimiter?: string): string[] {
  // Normalize <SOH> to |
  const normalizedInput = input.replace(/<SOH>/gi, "|");

  // Split by "8=FIX" lookahead, filter out empty or non-FIX strings
  // This handles log files where messages might be separated by newlines or other text
  // It assumes every message starts with 8=FIX
  return normalizedInput
    .split(/(?=8=FIX)/)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s.startsWith("8=FIX")) return false;
      if (customDelimiter && s.includes(customDelimiter)) return true;
      return s.includes("\x01") || s.includes("|") || s.includes("^") || s.includes(" ");
    });
}

function MultiMessageView({ messages, defaultVersion }: { messages: string[]; defaultVersion: string }) {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [selectedMsgType, setSelectedMsgType] = useState("all");

  // Extract unique MsgTypes for filter dropdown
  const msgTypes = Array.from(
    new Set(
      messages.map((msg) => {
        const { fields } = parseFixMessage(msg, defaultVersion, preferences.customDelimiter);
        const msgType = fields.find((f) => f.tag === TAGS.MSG_TYPE);
        return msgType?.value || "Unknown";
      }),
    ),
  ).sort();

  const filteredMessages = messages.filter((msg) => {
    const { fields } = parseFixMessage(msg, defaultVersion);
    const msgType = fields.find((f) => f.tag === TAGS.MSG_TYPE)?.value || "Unknown";

    if (selectedMsgType !== "all" && msgType !== selectedMsgType) return false;
    if (!searchText) return true;
    return msg.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <List
      navigationTitle={`Found ${filteredMessages.length} Messages`}
      searchBarPlaceholder="Search within messages..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Message Type" onChange={setSelectedMsgType}>
          <List.Dropdown.Item title="All Message Types" value="all" />
          {msgTypes.map((type) => {
            // Get description for the type
            const spec = FIX_SPECS[defaultVersion] || FIX_SPECS["FIX.4.4"];
            const desc = spec.enums[TAGS.MSG_TYPE]?.[type] || type;
            return <List.Dropdown.Item key={type} title={`${desc} (${type})`} value={type} />;
          })}
        </List.Dropdown>
      }
      isLoading={messages.length === 0}
    >
      {filteredMessages.map((msg, index) => {
        const { fields, version: msgVersion } = parseFixMessage(msg, defaultVersion, preferences.customDelimiter);
        const msgType = fields.find((f) => f.tag === TAGS.MSG_TYPE);
        const sender = fields.find((f) => f.tag === TAGS.SENDER_COMP_ID)?.value || "Unknown";
        const target = fields.find((f) => f.tag === TAGS.TARGET_COMP_ID)?.value || "Unknown";
        const time = fields.find((f) => f.tag === TAGS.SENDING_TIME)?.value;

        let timeDisplay = "";
        if (time) {
          const local = formatFixTimestamp(time);
          timeDisplay = local ? local.split(",")[1].trim() : time; // Just show time part if possible
        }

        const description = msgType?.description || msgType?.value || "Unknown";

        // Smart Icon Logic
        let itemIcon = getTagIcon(TAGS.MSG_TYPE, msgType?.value || "", msgVersion);
        let itemColor = getTagColor(TAGS.MSG_TYPE, msgType?.value || "", msgVersion);

        if (msgType?.value === MSG_TYPE.NEW_ORDER_SINGLE) {
          const side = fields.find((f) => f.tag === TAGS.SIDE);
          if (side) {
            itemIcon = getTagIcon(TAGS.SIDE, side.value, msgVersion);
            itemColor = getTagColor(TAGS.SIDE, side.value, msgVersion);
          }
        } else if (msgType?.value === MSG_TYPE.EXECUTION_REPORT) {
          const ordStatus = fields.find((f) => f.tag === TAGS.ORD_STATUS);
          if (ordStatus) {
            itemIcon = getTagIcon(TAGS.ORD_STATUS, ordStatus.value, msgVersion);
            itemColor = getTagColor(TAGS.ORD_STATUS, ordStatus.value, msgVersion);
          }
        }

        const summary = getFixMessageSummary(fields);

        return (
          <List.Item
            key={index}
            icon={
              preferences.showIcons
                ? {
                    source: itemIcon,
                    tintColor: itemColor,
                  }
                : undefined
            }
            title={`${sender} -> ${target}`}
            subtitle={summary}
            accessories={[
              {
                tag: {
                  value: description,
                  color: getTagColor(TAGS.MSG_TYPE, msgType?.value || "", msgVersion) || Color.SecondaryText,
                },
              },
              ...(timeDisplay ? [{ text: timeDisplay, icon: Icon.Clock }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Sidebar}
                  target={
                    <ParsedMessageView
                      message={msg}
                      defaultVersion={defaultVersion}
                      onDefaultVersionChange={() => {}} // No-op for now in drill-down
                      source={`Message ${index + 1}`}
                    />
                  }
                />
                <Action.CopyToClipboard content={msg} title="Copy Raw Message" />
                <ActionPanel.Section title="Focus on Order">
                  {fields.find((f) => f.tag === TAGS.ORDER_ID) && (
                    <Action
                      title={`Filter by Order ID (${fields.find((f) => f.tag === TAGS.ORDER_ID)?.value})`}
                      icon={Icon.Filter}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => setSearchText(fields.find((f) => f.tag === TAGS.ORDER_ID)?.value || "")}
                    />
                  )}
                  {fields.find((f) => f.tag === TAGS.CL_ORD_ID) && (
                    <Action
                      title={`Filter by ClOrdID (${fields.find((f) => f.tag === TAGS.CL_ORD_ID)?.value})`}
                      icon={Icon.Filter}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                      onAction={() => setSearchText(fields.find((f) => f.tag === TAGS.CL_ORD_ID)?.value || "")}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Export Tools">
                  <Action.CopyToClipboard
                    title="Copy All as JSON"
                    icon={Icon.Code}
                    content={JSON.stringify(
                      messages.map((m) => parseFixMessage(m, defaultVersion, preferences.customDelimiter).fields),
                      null,
                      2,
                    )}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Summaries"
                    icon={Icon.Text}
                    content={messages
                      .map((m) => {
                        const { fields } = parseFixMessage(m, defaultVersion, preferences.customDelimiter);
                        return getFixMessageSummary(fields);
                      })
                      .join("\n")}
                    shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.FixParser }>) {
  const preferences = getPreferenceValues<Preferences>();
  const [input, setInput] = useState(props.arguments.message || "");
  const [defaultVersion, setDefaultVersion] = useState(preferences.defaultVersion);
  const { push } = useNavigation();

  // 0. Check Arguments (Immediate Render)
  if (props.arguments.message) {
    const messages = splitFixMessages(props.arguments.message, preferences.customDelimiter);
    if (messages.length > 1) {
      return <MultiMessageView messages={messages} defaultVersion={defaultVersion} />;
    } else if (messages.length === 1) {
      return (
        <ParsedMessageView
          message={messages[0]}
          defaultVersion={defaultVersion}
          onDefaultVersionChange={(newValue) => setDefaultVersion(newValue as typeof defaultVersion)}
          source="Argument"
        />
      );
    }
  }

  useEffect(() => {
    async function checkInputSources() {
      // 1. Check Selected Text
      if (preferences.autoParseSelection) {
        try {
          const selectedText = await getSelectedText();
          if (selectedText) {
            const messages = splitFixMessages(selectedText, preferences.customDelimiter);
            if (messages.length > 1) {
              push(<MultiMessageView messages={messages} defaultVersion={defaultVersion} />);
              showToast({ style: Toast.Style.Success, title: `Found ${messages.length} messages in Selection` });
              return;
            } else if (messages.length === 1) {
              push(
                <ParsedMessageView
                  message={messages[0]}
                  defaultVersion={defaultVersion}
                  onDefaultVersionChange={(newValue) => setDefaultVersion(newValue as typeof defaultVersion)}
                  source="Selection"
                />,
              );
              showToast({ style: Toast.Style.Success, title: "Auto-parsed from Selection" });
              return;
            }
          }
        } catch {
          // Ignore
        }
      }

      // 2. Check Clipboard
      if (preferences.autoParseClipboard) {
        try {
          const clipboardText = await Clipboard.readText();
          if (clipboardText) {
            const messages = splitFixMessages(clipboardText, preferences.customDelimiter);
            if (messages.length > 1) {
              push(<MultiMessageView messages={messages} defaultVersion={defaultVersion} />);
              showToast({ style: Toast.Style.Success, title: `Found ${messages.length} messages in Clipboard` });
              return;
            } else if (messages.length === 1) {
              push(
                <ParsedMessageView
                  message={messages[0]}
                  defaultVersion={defaultVersion}
                  onDefaultVersionChange={(newValue) => setDefaultVersion(newValue as typeof defaultVersion)}
                  source="Clipboard"
                />,
              );
              showToast({ style: Toast.Style.Success, title: "Auto-parsed from Clipboard" });
              return;
            }
          }
        } catch {
          // Ignore
        }
      }
    }
    checkInputSources();
  }, []);

  function handleSubmit(values: { message: string }) {
    if (values.message) {
      const messages = splitFixMessages(values.message, preferences.customDelimiter);
      if (messages.length > 1) {
        push(<MultiMessageView messages={messages} defaultVersion={defaultVersion} />);
      } else {
        push(
          <ParsedMessageView
            message={values.message}
            defaultVersion={defaultVersion}
            onDefaultVersionChange={(newValue) => setDefaultVersion(newValue as typeof defaultVersion)}
          />,
        );
      }
    }
  }

  async function handleParseClipboard() {
    try {
      const text = await Clipboard.readText();
      if (text) {
        setInput(text);
        const messages = splitFixMessages(text, preferences.customDelimiter);
        if (messages.length > 1) {
          push(<MultiMessageView messages={messages} defaultVersion={defaultVersion} />);
          showToast({ style: Toast.Style.Success, title: `Found ${messages.length} messages` });
        } else if (messages.length === 1) {
          push(
            <ParsedMessageView
              message={messages[0]}
              defaultVersion={defaultVersion}
              onDefaultVersionChange={(newValue) => setDefaultVersion(newValue as typeof defaultVersion)}
              source="Clipboard"
            />,
          );
          showToast({ style: Toast.Style.Success, title: "Parsed from Clipboard" });
        } else {
          showToast({ style: Toast.Style.Failure, title: "No valid FIX messages found" });
        }
      } else {
        showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      }
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to read clipboard" });
    }
  }

  return (
    <Form
      navigationTitle={`FIX Parser (Default: ${defaultVersion})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Parse FIX Message" onSubmit={handleSubmit} />
          <Action
            title="Parse Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={handleParseClipboard}
          />
          <Action.Push
            title="Change FIX Version"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            target={
              <VersionPicker
                currentVersion={defaultVersion}
                onSelect={(newValue) => setDefaultVersion(newValue as typeof defaultVersion)}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="FIX Message"
        placeholder={`Paste your FIX message here (Default: ${defaultVersion})`}
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}
