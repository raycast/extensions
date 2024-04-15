import { Action, ActionPanel, Detail, Form, Icon, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { getPersonioToken, submitTime } from "./api/api";
import { getEmployeeInfo } from "./api/employeeinfo";

export default function TrackTime() {
  const [token, setToken] = useState("");
  const [startdate, set_startDate] = useState<Date | null>(null);
  const [enddate, set_endDate] = useState<Date | null>(null);
  const [breaktime, setBreak] = useState<string>("0");

  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    async function call() {
      const token_ = await getPersonioToken();
      const employeeNumber = getPreferenceValues().employeeNumber;
      const employeeName = await getEmployeeInfo(employeeNumber, token_);
      setEmployeeName(employeeName);
      setToken(token_);
    }
    call();
  }, []);

  if (token) {
    return (
      <Form
        navigationTitle="Track Time"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Submit Time"
              icon={Icon.Checkmark}
              onSubmit={() => submitTime({ startdate, enddate, breaktime }, token)}
            />
            <Action title="Change Employee Number" icon={Icon.Person} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description
          title=""
          text={`Hi ${employeeName},\nSubmit your past times here.\nPress cmd+enter to submit your time.`}
        />
        <Form.Separator />
        <Form.DatePicker id="launchDate" title="Start time" value={startdate} onChange={set_startDate} />
        <Form.DatePicker id="endDate" title="End time" value={enddate} onChange={set_endDate} />
        <Form.TextField id="breaktime" title="Break (in minutes)" value={breaktime} onChange={setBreak} />
      </Form>
    );
  } else {
    return <Detail isLoading={true} />;
  }
}

// Change Text in funcition
