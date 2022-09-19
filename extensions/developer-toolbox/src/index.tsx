import { List } from "@raycast/api";
import {
  base64Decode,
  base64Encode,
  decodeJWT,
  decodeURL,
  encodeURL,
  localDateISO8601,
  localTimestamp,
  minifyJSON,
  prettifyJSON,
  timestampToDateString,
} from "./actions";
import ClipboardAction from "./ClipboardAction";

export default function Command() {
  return (
    <List>
      <List.Section title="Encode/Decode">
        <List.Item
          key="1"
          icon="list-icon.png"
          title="Base64 Encode"
          subtitle="Base64 encode text from clipboard"
          actions={
            <ClipboardAction title="Base64 Encode" action={base64Encode} />
          }
        />
        <List.Item
          key="2"
          icon="list-icon.png"
          title="Base64 Decode"
          subtitle="Base64 decode text from clipboard"
          actions={
            <ClipboardAction title="Base64 Decoded" action={base64Decode} />
          }
        />
        <List.Item
          key="7"
          icon="list-icon.png"
          title="URL Encode"
          subtitle="URL encode text from clipboard"
          actions={<ClipboardAction title="URL Encode" action={encodeURL} />}
        />
        <List.Item
          key="8"
          icon="list-icon.png"
          title="URL Decode"
          subtitle="URL decode text from clipboard"
          actions={<ClipboardAction title="URL Decode" action={decodeURL} />}
        />
        <List.Item
          key="9"
          icon="list-icon.png"
          title="JWT Decode"
          subtitle="Decode JWT token from clipboard"
          actions={<ClipboardAction title="JWT Decode" action={decodeJWT} />}
        />
      </List.Section>

      <List.Section title="Date">
        <List.Item
          key="3"
          icon="list-icon.png"
          title="Timestamp"
          subtitle="Return the time in seconds since the epoch as a floating point number. "
          actions={
            <ClipboardAction title="Timestamp" action={localTimestamp} />
          }
        />
        <List.Item
          key="4"
          icon="list-icon.png"
          title="Local Date"
          subtitle="Return local date in ISO8601 format"
          actions={
            <ClipboardAction title="Local Date" action={localDateISO8601} />
          }
        />
        <List.Item
          key="5"
          icon="list-icon.png"
          title="Timestamp to Date"
          subtitle="Convert timestamp to date and return in ISO8601 format"
          actions={
            <ClipboardAction
              title="Timestamp to Date"
              action={timestampToDateString}
            />
          }
        />
      </List.Section>
      <List.Section title="Format">
        <List.Item
          key="5"
          icon="list-icon.png"
          title="Prettify JSON"
          subtitle="Prettify JSON text from clipboard"
          actions={
            <ClipboardAction
              title="Prettify JSON"
              action={prettifyJSON}
              outputType="copyToClipboard"
            />
          }
        />
        <List.Item
          key="6"
          icon="list-icon.png"
          title="Minify JSON"
          subtitle="Minify JSON text from clipboard"
          actions={
            <ClipboardAction
              title="Minify JSON"
              action={minifyJSON}
              outputType="copyToClipboard"
            />
          }
        />
      </List.Section>
    </List>
  );
}
