import { LocalStorage, LaunchProps, Detail } from "@raycast/api";
import { useEffect } from "react";

interface Arguments {
    token?: string
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const setCookie = async () => {
      await LocalStorage.setItem("cookie",props.arguments.token as string);
  }

  useEffect(() => {
          setCookie()
  }, [])

  return <Detail markdown="Token set" />
}
