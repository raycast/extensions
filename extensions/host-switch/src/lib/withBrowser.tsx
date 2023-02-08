import { type ComponentType, useEffect, useState } from "react";
import { type Application, Detail, getFrontmostApplication } from "@raycast/api";
import { type Browser, getBrowser } from "./browser";

export interface WithBrowser {
  browser: Browser;
}

export const withBrowser = <P extends WithBrowser>(Component: ComponentType<P>) => {
  return (props: Omit<P, "browser">) => {
    const [application, setApplication] = useState<Application>();
    const [browser, setBrowser] = useState<Browser>();

    useEffect(() => {
      getFrontmostApplication().then((app) => {
        setApplication(app);
        setBrowser(getBrowser(app));
      });
    }, []);

    if (application && !browser) {
      return <Detail markdown={`**${application.name}** is not supported. Use Safari, Arc or Chrome instead`} />;
    }

    return <Component {...(props as P)} browser={browser} />;
  };
};
