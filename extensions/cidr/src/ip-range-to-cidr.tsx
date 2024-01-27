import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { validateIPv4 } from "./utils/validation-utils";
import { CIDR } from "./utils/constants";
import { Detail } from "@raycast/api";
import { ipRangeToCIDR } from "./utils/cidr-utils";

function renderResultToMarkdown(res: CIDR[]): string {
  return `## Result:\n${res.reduce((a, b) => {
    const [[p1, p2, p3, p4], mask] = b;
    return `${a}\n- ${p1}.${p2}.${p3}.${p4}/${mask}`;
  }, "")}`;
}

export default function IPRangeToCIDR() {
  const [beginIPError, setBeginIPError] = useState<string | undefined>();
  const [endIPError, setEndIPError] = useState<string | undefined>();
  const { push } = useNavigation();

  function dropBeginIPErrorIfNeeded() {
    if (beginIPError && beginIPError.length > 0) {
      setBeginIPError(undefined);
    }
  }

  function dropEndIPErrorIfNeeded() {
    if (endIPError && endIPError.length > 0) {
      setEndIPError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Calculate"
            onSubmit={(values) => {
              const cidrRes = ipRangeToCIDR(values["beginIPField"], values["endIPField"]);
              push(
                cidrRes.ok ? (
                  <Detail
                    markdown={renderResultToMarkdown(cidrRes.val)}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard title="Copy Result" content={renderResultToMarkdown(cidrRes.val)} />
                      </ActionPanel>
                    }
                  />
                ) : (
                  <Detail markdown={`${cidrRes.val.msg}`} />
                )
              );
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="beginIPField"
        title="IP from"
        placeholder="Enter the beginning IP"
        error={beginIPError}
        onChange={dropBeginIPErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            const res = validateIPv4(value);
            if (res.err) {
              setBeginIPError(res.val.msg);
            } else {
              dropBeginIPErrorIfNeeded();
            }
          } else {
            setBeginIPError("The field should't be empty!");
          }
        }}
      />
      <Form.TextField
        id="endIPField"
        title="IP to"
        placeholder="Enter the end IP"
        error={endIPError}
        onChange={dropEndIPErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            const res = validateIPv4(value);
            if (res.err) {
              setEndIPError(res.val.msg);
            } else {
              dropEndIPErrorIfNeeded();
            }
          } else {
            setEndIPError("The field should't be empty!");
          }
        }}
      />
    </Form>
  );
}
