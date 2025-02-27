import { useEffect } from "react";
import { authorize, client } from "./oauth";
import { client as cnvClient, UserService} from "../client/ts";
import { Detail } from "@raycast/api";
import "cross-fetch/polyfill";
// import fetch from "cross-fetch";
// import { Headers } from "cross-fetch";
// const fetch = fetch;
// const { Headers } = fetch;
// var Headers = Headers();

export default function Index() {
  useEffect(() => {
    async function f() {
      await authorize();
    const token = (await client.getTokens())?.accessToken;
    console.log(token)
    const u = await UserService.usersMe({ auth: token });
    console.log(u);
    }
    f();
  }, [])

  return <Detail />
}
