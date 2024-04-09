import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { addTime, getPersonioToken } from "./api/api";
import moment from "moment-timezone";
import { getEmployeeInfo } from "./api/employeeinfo";

export default function TrackTime() {
  const [token, setToken] = useState("");
  const [startdate, set_startDate] = useState<Date | null>(null);
  const [enddate, set_endDate] = useState<Date | null>(null);
  const [breaktime, setBreak] = useState<string>("0");

  const [employeeName, setEmployeeName] = useState("");

  useEffect(() => {
    async function call() {
      const token = await getPersonioToken();
      const employeeNumber = getPreferenceValues().employeeNumber;
      const employeeName = await getEmployeeInfo(employeeNumber, token);
      setEmployeeName(employeeName);
      setToken(token);
    }
    call();
  }, []);

  function parseDateAndTime(dateString: Date | null, timezone: string = getPreferenceValues().timezone) {
    const date = moment.tz(dateString, timezone);

    const formattedDate = date.format("YYYY-MM-DD");
    const formattedTime = date.format("HH:mm");
    return { date: formattedDate, time: formattedTime };
  }

  interface FormValues {
    startdate: Date | null;
    enddate: Date | null;
    breaktime: string;
  }

  //calls the addTime function with the given values
  const submitTime = async (values: FormValues) => {
    const startdate = parseDateAndTime(values.startdate);
    const enddate = parseDateAndTime(values.enddate);
    const employeeNumber = getPreferenceValues().employeeNumber;
    if (startdate.date == "Invalid date" || startdate.time == "Invalid date") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "You must add a valid start time.",
      });
      return;
    }
    if (enddate.date == "Invalid date" || enddate.time == "Invalid date") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "You must add a valid end time.",
      });
      return;
    }

    if (
      await confirmAlert({
        title: "Are your sure?",
        message: `Do you want to submit the time from ${startdate.time} to ${enddate.time} with a break of ${values.breaktime} minutes?`,
      })
    ) {
      addTime(employeeNumber, startdate.date, startdate.time, enddate.time, parseInt(values.breaktime), token);
    } else {
      await showToast({ style: Toast.Style.Failure, title: "Submit was cancelled!", message: "Unfortunate!" });
    }
  };

  if (token) {
    return (
      <Form
        navigationTitle="Track Time"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Submit Time"
              icon={Icon.Checkmark}
              onSubmit={() => submitTime({ startdate, enddate, breaktime })}
            />
            <Action title="Change Employee Number" icon={Icon.Person} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      >
        <Form.Description
          title=""
          text={`Hi ${employeeName}\n\nTrack your time for today by specifying the start and end times of your working day and the break you took in minutes.\nPress cmd+enter to submit your time.`}
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
