import Directory from "./components/Directory";
import { useEffect, useState } from "react";
import { client, getLoginUser } from "./api";
import Login from "./components/Login";
import { showToast, Toast, useNavigation } from "@raycast/api";
import Loading from "./components/Loading";

export default function Command() {
  const [defaultDriveID, setDefaultDriveID] = useState<string>("");
  const { push, pop } = useNavigation();

  useEffect(() => {
    const f = async () => {
      await client.init();
      const getUser = await getLoginUser(client);
      if (getUser.tokenInvalid) {
        push(
          <Login
            onFinish={async () => {
              try {
                const user = (await client.getSelfUser()).data;
                setDefaultDriveID(user.default_drive_id);
                pop();
              } catch (e) {
                //
              }
            }}
          />
        );
        return;
      } else if (getUser.user) {
        setDefaultDriveID(getUser.user.default_drive_id);
      } else {
        await showToast(Toast.Style.Failure, "request fail", getUser.msg);
        return;
      }
    };
    f();
  }, []);

  return defaultDriveID && defaultDriveID !== "" ? (
    <Directory defaultDriveID={defaultDriveID} path={""} />
  ) : (
    <Loading />
  );
}
