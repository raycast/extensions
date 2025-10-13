import { type ComponentType, useEffect, useState, createContext, useContext } from "react";
import { type Application, Detail, getFrontmostApplication } from "@raycast/api";
import { type Browser, getBrowser } from "./browser";

export interface WithBrowser {
  browser: Browser;
}

interface BrowserContextProps {
  browser: Browser;
}

const BrowserContext = createContext<BrowserContextProps>({} as BrowserContextProps);

export const useBrowser = () => useContext(BrowserContext).browser;

export const withBrowser = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const [application, setApplication] = useState<Application>();
    const [browser, setBrowser] = useState<Browser>();

    useEffect(() => {
      getFrontmostApplication().then((app) => {
        setApplication(app);
        setBrowser(getBrowser(app));
      });
    }, []);

    if (!browser) {
      if (application) {
        return (
          <Detail markdown={`**${application.name}** is not supported. Use Safari, Arc, Brave or Chrome instead`} />
        );
      }
      return null;
    }

    return (
      <BrowserContext.Provider value={{ browser }}>
        <Component {...props} />
      </BrowserContext.Provider>
    );
  };
};
