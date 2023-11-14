import { Detail, MenuBarExtra, environment } from "@raycast/api";
import { ComponentType, ReactElement, ReactNode, useMemo, useState } from "react";

export interface OAuthSessionConfig {
  authorize(): Promise<string>;
}

let accessToken: string | null = null;

export function OAuthSessionProvider(props: { children: ReactNode; config: OAuthSessionConfig }) {
  const [x, forceRerender] = useState(0);

  // we use a `useMemo` instead of `useEffect` to avoid a render
  useMemo(() => {
    (async function () {
      accessToken = await props.config.authorize();
      forceRerender(x + 1);
    })();
  }, []);

  if (!accessToken) {
    if (environment.commandMode === "view") {
      // Using the <List /> component makes the placeholder buggy
      return <Detail isLoading />;
    } else if (environment.commandMode === "menu-bar") {
      return <MenuBarExtra isLoading />;
    } else {
      console.error("`withOAuthSession` is only supported in `view` and `menu-bar` mode");
      return <Detail />;
    }
  }

  return <>{props.children}</>;
}

export function withOAuthSession<P extends object>(Component: ComponentType<P>, config: OAuthSessionConfig) {
  return (props: P): ReactElement => {
    return (
      <OAuthSessionProvider config={config}>
        <Component {...props} />
      </OAuthSessionProvider>
    );
  };
}

export function getOAuthSession() {
  if (!accessToken) {
    throw new Error("You must call `withOAuthSession` before using `useOAuth`");
  }

  return accessToken;
}
