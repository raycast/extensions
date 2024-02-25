import { Icon, MenuBarExtra, open, getPreferenceValues, showHUD } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";

type DataSession = { _id: string; focusName: string; createdAt: string };
type Session = { _id: string; focusName: string; startedAt: string; timeString: string };

interface Preferences {
  name: string;
  apiKey?: string;
}

function getTimeString(focusStartDateFromData: Date) {
  const now = new Date();
  const diff = now.getTime() - focusStartDateFromData.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const timeString = `${hours}h ${minutes}m`;
  return timeString;
}

async function showNoApiKeyHud() {
  await showHUD("Please enter a valid API key.");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  if (preferences.apiKey === undefined) {
    showNoApiKeyHud();
    return;
  }

  const [cachedSessionState, setCachedSessionState] = useCachedState("session", {
    _id: "",
    focusName: "",
    startedAt: "",
    timeString: "",
  });

  const { isLoading } = useFetch(`https://projext-tau.vercel.app/api/focus/session/${preferences.apiKey}`, {
    onData: (data: DataSession) => {
      if (data._id !== null) {
        console.log(cachedSessionState);
        if (cachedSessionState._id !== data._id) {
          // there is a new session that is not the same as the one in the cache, so cache has to be updated
          const session: Session = {
            _id: data._id,
            focusName: data.focusName,
            startedAt: new Date(data.createdAt).toLocaleDateString("en-US", {
              hour: "numeric",
              minute: "numeric",
              second: "numeric",
            }),
            timeString: getTimeString(new Date(data.createdAt)),
          };

          setCachedSessionState(session);
        }
      }
    },
    onError: async () => {
      // no active session, clear the cache
      const session: Session = {
        _id: "",
        focusName: "None",
        startedAt: "Never",
        timeString: "",
      };

      setCachedSessionState(session);
    },
  });

  return (
    <MenuBarExtra
      title={cachedSessionState.timeString}
      tooltip={"Focus: " + cachedSessionState.focusName}
      icon={Icon.Moon}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item title={"Focus: " + cachedSessionState.focusName} />
      <MenuBarExtra.Item title={"Started at: " + cachedSessionState.startedAt} />
      <MenuBarExtra.Item title="See Sessions" onAction={() => open("https://projext-tau.vercel.app/focus")} />
    </MenuBarExtra>
  );
}
