import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  environment,
  List,
  OpenInBrowserAction,
  popToRoot,
  PushAction,
  showHUD,
} from "@raycast/api";
import fs from "fs";
import mkdirp from "mkdirp";
import path from "path";
import { useEffect, useMemo, useState } from "react";
import {
  consumeLoginSession,
  createLoginSession,
  fetchProjects,
  fetchUser,
  logout,
  ProjectGQL,
  projectUrl,
  railwayWebUrl,
  UserGQL,
} from "./railway";

const railwayConfigPath = path.resolve(environment.supportPath, "config.json");

const saveLoginToken = (token: string) => {
  mkdirp.sync(environment.supportPath);

  const contents = JSON.stringify({ token });
  fs.writeFileSync(railwayConfigPath, contents, "utf8");
};

const deleteLoginToken = () => {
  fs.writeFileSync(railwayConfigPath, JSON.stringify({}), "utf8");
};

const useRailwayToken = (): string | null =>
  useMemo(() => {
    try {
      const { token } = JSON.parse(fs.readFileSync(railwayConfigPath, "utf8"));
      return token;
    } catch (e) {
      // we ignore the error
      return null;
    }
  }, [environment.supportPath]);

const useUser = () => {
  const token = useRailwayToken();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserGQL | null>(null);

  useEffect(() => {
    if (token == null) {
      setIsLoading(false);
      return;
    }

    (async () => {
      const user = await fetchUser(token);
      setUser(user);
      setIsLoading(false);
    })();
  }, []);

  return { token, isLoading, user };
};

export default function Command() {
  const { user, isLoading, token } = useUser();

  if (isLoading) {
    return <List isLoading />;
  }

  if (user == null || token == null) {
    return <RailwayLogin />;
  }

  return <ListProjects token={token} />;
}

const ListProjects: React.FC<{ token: string }> = ({ token }) => {
  const [projects, setProjects] = useState<ProjectGQL[] | null>(null);

  useEffect(() => {
    (async () => {
      const projects = await fetchProjects(token);
      setProjects(projects);
    })();
  }, []);

  return (
    <List isLoading={projects == null}>
      {projects != null && (
        <>
          {projects.map((p) => (
            <List.Item
              key={p.id}
              title={p.name}
              subtitle={p.description}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <OpenInBrowserAction title="Project Settings" url={projectUrl(p.id, "settings")} />
                    <OpenInBrowserAction title="Project Deployments" url={projectUrl(p.id, "deployments")} />
                    <OpenInBrowserAction
                      title="Latest Deployment"
                      url={projectUrl(p.id, "deployments?open=true")}
                      shortcut={{ modifiers: ["cmd"], key: "l" }}
                    />
                    <OpenInBrowserAction
                      title="Project Variables"
                      url={projectUrl(p.id, "variables")}
                      shortcut={{ modifiers: ["cmd"], key: "v" }}
                    />
                    <OpenInBrowserAction
                      title="Project Metrics"
                      url={projectUrl(p.id, "metrics")}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <CopyToClipboardAction
                      title="Copy Project URL"
                      content={projectUrl(p.id)}
                      shortcut={{ modifiers: ["opt"], key: "c" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <LogoutAction token={token} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
};

const LogoutAction: React.FC<{ token: string }> = ({ token }) => (
  <ActionPanel.Item
    title="Logout of Railway"
    onAction={async () => {
      await logout(token);
      deleteLoginToken();
      popToRoot();
      showHUD("Logged out 👋");
    }}
  />
);

const RailwayLogin = () => {
  const [loginSession, setLoginSession] = useState<string | null>(null);
  useEffect(() => {
    createLoginSession().then((words) => setLoginSession(words));
  }, []);

  return (
    <List isLoading={loginSession == null}>
      {loginSession != null && (
        <List.Item
          title="Login to Railway"
          actions={
            <ActionPanel title="#1 in raycast/extensions">
              <PushAction title="Start Railway Login" target={<LoginWaiting loginSession={loginSession} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

// What appears as name on Railway security page for the session
const LOGIN_SESSION_NAME = "Raycast";

const POLL_INTERVAL = 2000;

const LoginWaiting: React.FC<{ loginSession: string }> = ({ loginSession }) => {
  const [loggedIn, setLoggedIn] = useState(false);

  const url = useMemo(() => {
    const queryString = `wordCode=${loginSession}&hostname=${LOGIN_SESSION_NAME}`;
    const data = Buffer.from(queryString).toString("base64url");
    return `${railwayWebUrl}/cli-login?d=${data}`;
  }, [loginSession]);

  // Poll for updates to the login session
  useEffect(() => {
    const pollForUpdate = async () => {
      const token = await consumeLoginSession(loginSession);

      if (token != null && typeof token === "string") {
        // We are logged in!
        saveLoginToken(token);
        setLoggedIn(true);
        popToRoot();
        showHUD("Logged in 🚄");
      }
    };

    const interval = setInterval(pollForUpdate, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loggedIn) {
    return (
      <Detail
        markdown={`
# Successfully logged in!
`}
      />
    );
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Launch Railway" url={url} />
        </ActionPanel>
      }
      markdown={`
# Login to Railway

Your login words are

    ${loginSession}

1. [Go to Railway](${url})
2. If the words match, click "Verify"
`}
    />
  );
};
