import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { SubmitTimeFormValues, isAuthenticated, submitTime } from "./api/api";
import { getEmployeeInfo } from "./api/employeeinfo";
import { cache } from "./api/cache";
import { TrackTimeForm } from "./components/TrackTimeForm";

export default function TrackTimeCommand() {
  const [formValues, setFormValues] = useState<SubmitTimeFormValues>({
    startDate: null,
    endDate: null,
    breakTime: "0",
  });
  const [employeeName, setEmployeeName] = useState("");
  const [isAuth, setIsAuth] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    async function call() {
      const isAuth_ = await isAuthenticated();
      setIsAuth(isAuth_);

      if (!isAuth_) {
        return;
      }

      const employeeNumber = getPreferenceValues().employeeNumber;
      const employeeName = await getEmployeeInfo(employeeNumber);
      setEmployeeName(employeeName);

      // when a start date or break is available in the cache, a user has previously entered
      // a start date or break. By retrieving the cache values, the user can continue with their previous values.

      const cachedDate = cache.get("startDate");
      if (cachedDate) {
        setFormValues((formValues) => {
          formValues.startDate = new Date(cachedDate);
          return formValues;
        });
      }

      const cachedBreak = cache.get("breakTime");
      if (cachedBreak) {
        setFormValues((formValues) => {
          formValues.breakTime = cachedBreak;
          return formValues;
        });
      }
    }
    call();
  }, []);

  const isLoading = !formValues || !employeeName;

  if (isAuth === undefined) {
    return <Detail isLoading={true} />;
  } else {
    if (isAuth) {
      if (!isLoading) {
        return (
          <TrackTimeForm
            onSubmit={submitTime}
            onStartDateChange={(newDate) => cache.set("startDate", newDate ? newDate.toISOString() : "", 14 * 60)}
            onBreakTimeChange={(newBreakTime) => cache.set("breakTime", newBreakTime, 10 * 60)}
            defaultStartDate={formValues.startDate}
            defaultEndDate={formValues.endDate}
            defaultBreakTime={formValues.breakTime}
            employeeName={employeeName}
            description={
              "Track your time for today by specifying the start and end times of your working day and the break you took in minutes.\nPress cmd+enter to submit your time."
            }
          />
        );
      } else {
        return <Detail isLoading={true} />;
      }
    } else {
      return <Detail markdown={"You have to check your credentials."} />;
    }
  }
}
