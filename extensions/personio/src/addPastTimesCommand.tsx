import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { isAuthenticated, submitTime } from "./api/api";
import { getEmployeeInfo } from "./api/employeeinfo";
import { TrackTimeForm } from "./components/TrackTimeForm";

export default function AddPastTimesCommand() {
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
    }
    call();
  }, []);

  const isLoading = !employeeName;

  if (isAuth === undefined) {
    return <Detail isLoading={true} />;
  } else {
    if (isAuth) {
      if (!isLoading) {
        return (
          <TrackTimeForm
            onSubmit={submitTime}
            defaultStartDate={null}
            defaultEndDate={null}
            defaultBreakTime={"0"}
            employeeName={employeeName}
            description={"Submit your past times here.\nPress cmd+enter to submit your time."}
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
