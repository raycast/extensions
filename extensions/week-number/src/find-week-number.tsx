import { Action, ActionPanel, Form, Icon, openExtensionPreferences } from "@raycast/api";
import React, { useState } from "react";
import { getWeekNumber, isEmpty } from "./utils/common-utils";

export default function FindWeekNumber() {
  const [curDate, setCurDate] = useState<Date | null>(new Date());
  const [weekNum, setWeekNum] = useState<string>(getWeekNumber());
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title={"Today"}
            icon={Icon.Calendar}
            onAction={() => {
              setCurDate(new Date());
              setWeekNum(getWeekNumber());
            }}
          ></Action>
          <ActionPanel.Section>
            <Action
              title={"Configure Extension"}
              icon={Icon.Gear}
              shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
              onAction={async () => {
                await openExtensionPreferences();
              }}
            ></Action>
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title="Date"
        value={curDate}
        onChange={(date) => {
          setCurDate(date);
          if (date) {
            setWeekNum(getWeekNumber(date));
          } else {
            setWeekNum("");
          }
        }}
      />
      {!isEmpty(weekNum) && <Form.Description title={"Week Number"} text={weekNum}></Form.Description>}
    </Form>
  );
}
