import { Action, ActionPanel, Detail, Form, Icon, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { SubmitTimeFormValues, getPersonioToken, submitTime } from "./api/api";
import { getEmployeeInfo } from "./api/employeeinfo";
import { cache } from "./api/cache";

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

      // when a start date or break is available in the cache, a user has previously entered
      // a start date or break. By retrieving the cache values, the user can continue with their previous values.
      const fetchCachedDate = async () => {
        const cachedDate = cache.get("startDate");
        if (cachedDate) {
          set_startDate(new Date(cachedDate));
        }
      };
      fetchCachedDate();

      const fetchCachedBreak = async () => {
        const cachedBreak = cache.get("breaktime");
        if (cachedBreak) {
          setBreak(cachedBreak);
        }
      };
      fetchCachedBreak();
    }
    call();
  }, []);

  //caches the start time for 14 hours
  const cacheStartDate = async (values: SubmitTimeFormValues) => {
    const startdate = values.startdate ? values.startdate.toISOString() : "";
    cache.set("startDate", startdate, 14 * 60);
  };

  //caches the break time for 10 hours
  const cacheBreak = async (values: SubmitTimeFormValues) => {
    cache.set("breaktime", values.breaktime, 10 * 60);
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
              onSubmit={() => submitTime({ startdate, enddate, breaktime }, token)}
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
        <Form.DatePicker
          id="launchDate"
          title="Start time"
          value={startdate}
          onChange={(newDate) => {
            set_startDate(newDate);
            cacheStartDate({ startdate: newDate, enddate, breaktime });
          }}
        />
        <Form.DatePicker id="endDate" title="End time" value={enddate} onChange={set_endDate} />
        <Form.TextField
          id="breaktime"
          title="Break (in minutes)"
          value={breaktime}
          onChange={(newBreak) => {
            setBreak(newBreak);
            cacheBreak({ startdate, enddate, breaktime: newBreak });
          }}
        />
      </Form>
    );
  } else {
    return <Detail isLoading={true} />;
  }
}
