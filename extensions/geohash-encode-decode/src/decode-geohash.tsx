import { ActionPanel, Form, PushAction } from "@raycast/api";
import { useState } from "react";
import DecodedInfo from "./components/DecodedInfo";

export default function DecodeGeohash() {
  const [geohash, setGeohash] = useState("");

  const target = <DecodedInfo geohash={geohash} />;

  const Actions = (
    <ActionPanel>
      <PushAction title="Decode Geohash" target={target} />
    </ActionPanel>
  );

  return (
    <Form actions={Actions}>
      <Form.TextField
        id="geohash"
        value={geohash}
        onChange={setGeohash}
        title="Geohash to decode"
        placeholder="E.g., ezmju"
      />
    </Form>
  );
}
