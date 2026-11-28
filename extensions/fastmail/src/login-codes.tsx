import { Clipboard, Icon, launchCommand, LaunchType, MenuBarExtra, open, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { FRESH_MINUTES, FreshLogin, freshLogins } from "./util/codes";
import { getToken, InvalidTokenError } from "./util/jmap";

type State = { signedIn: false } | { signedIn: true; logins: FreshLogin[] };

async function load(): Promise<State> {
  if (!(await getToken())) return { signedIn: false };
  return { signedIn: true, logins: await freshLogins() };
}

export default function LoginCodes() {
  // Not useCachedPromise: codes are secrets and its cache is plain files on disk.
  const { data, isLoading, error } = usePromise(load);
  const logins = data?.signedIn && !error ? data.logins : [];
  const latestCode = logins.find((l) => l.code)?.code;
  const openSearch = async () => {
    try {
      await launchCommand({ name: "search", type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't open Search Email" });
    }
  };

  return (
    <MenuBarExtra
      icon={latestCode ? Icon.Key : Icon.Envelope}
      title={latestCode ?? undefined}
      tooltip="Fastmail login codes"
      isLoading={isLoading}
    >
      {error instanceof InvalidTokenError || data?.signedIn === false ? (
        <MenuBarExtra.Item
          title={data?.signedIn === false ? "Set Up Fastmail…" : "Fastmail Token No Longer Works…"}
          icon={Icon.Key}
          onAction={openSearch}
        />
      ) : logins.length === 0 ? (
        <MenuBarExtra.Item title={`No login codes in the last ${FRESH_MINUTES} minutes`} />
      ) : (
        <MenuBarExtra.Section title="Login Codes">
          {logins.map((login) => (
            <MenuBarExtra.Item
              key={login.id}
              icon={login.code ? Icon.Clipboard : Icon.Link}
              title={login.code ?? "Open Login Link"}
              subtitle={`${login.sender} · ${minutesAgo(login.receivedAt)}`}
              tooltip={login.code ? "Copy code" : (login.link ?? undefined)}
              onAction={async () => {
                if (login.code) {
                  await Clipboard.copy(login.code, { concealed: true });
                  await showHUD(`Copied ${login.code}`);
                } else if (login.link) {
                  await open(login.link);
                }
              }}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Search Email" icon={Icon.MagnifyingGlass} onAction={openSearch} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function minutesAgo(time: number): string {
  const minutes = Math.round((Date.now() - time) / 60000);
  return minutes < 1 ? "just now" : `${minutes}m ago`;
}
