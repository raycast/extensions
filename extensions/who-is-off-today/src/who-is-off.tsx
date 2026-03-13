import { useEffect, useState } from "react";
import DisplayWhoIsOff, { DisplayWhoIsOffArgs } from "./display/display-who-is-off";

import { showToast, Toast } from "@raycast/api";
import { today } from "./utils/date";
import { defaultRemote } from "./remote/defaultRemote";

export default function WhoIsOffTodayFull() {
    const [offs, setOffs] = useState<DisplayWhoIsOffArgs["offs"]>();
    const [day, setDay] = useState<Date>();

    useEffect(() => {
        setDay(today());
        const remote = defaultRemote();
        remote
            .offEmployees(today())
            .then(setOffs)
            .catch(({ message }) => {
                showToast({
                    message,
                    title: "Error!",
                    style: Toast.Style.Failure,
                });
                setOffs([]);
            });
    }, []);

    return <DisplayWhoIsOff offs={offs} today={day} />;
}
