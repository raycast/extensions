import {
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { messageFor, notifyFailure } from "./lib/command-ui";
import { getDefaultSelection } from "./lib/locations";
import { cachedCurrentSky, getSky } from "./lib/skyfrom-api";
import { autoState, toggleAutoPause } from "./lib/wallpaper";

async function getView(refresh: boolean, cacheOnly = false) {
  const settings = getPreferenceValues<Preferences>();
  const state = await autoState();
  const controls = { enabled: settings.autoWallpaper, paused: !!state.pausedByUser || (state.failures ?? 0) >= 3 };
  try {
    const selection = await getDefaultSelection({ cacheOnly, forceNow: true });
    if (!selection) return { ...controls, message: "Choose a default city to see its sky." };
    const { city } = selection;
    const result = cacheOnly ? await cachedCurrentSky(city) : await getSky({ city }, { staleOnError: !refresh });
    if (!result) return { ...controls, message: `Choose Refresh Now to preview ${city.name}.` };
    return {
      ...controls,
      city: city.name,
      local: result.value.local.replace("T", " · "),
      refreshed: new Date(result.savedAt).toLocaleString(),
      color: result.value.colors[Math.floor(result.value.colors.length / 2)],
    };
  } catch (error) {
    return { ...controls, message: messageFor(error) };
  }
}

export default function SkyMenuBar() {
  const [view, setView] = useState<Awaited<ReturnType<typeof getView>>>();
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getView(false, environment.launchType === LaunchType.Background)
      .then((value) => {
        if (mounted) setView(value);
      })
      .catch((error: unknown) => {
        if (mounted) setView({ message: messageFor(error), enabled: false, paused: false });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sky = view && "city" in view ? view : undefined;
  return (
    <MenuBarExtra
      icon={sky?.color ? { source: Icon.CircleFilled, tintColor: sky.color } : Icon.Sun}
      tooltip={sky?.city ? `SkyFrom · ${sky.city}` : "SkyFrom"}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section>
        {sky?.city ? (
          <>
            <MenuBarExtra.Item title={`${sky.city} · ${sky.local}`} />
            <MenuBarExtra.Item title={`Last refreshed ${sky.refreshed}`} />
          </>
        ) : (
          <MenuBarExtra.Item title={view && "message" in view ? view.message : "Loading SkyFrom…"} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            setLoading(true);
            try {
              const next = await getView(true);
              if ("message" in next && sky) {
                await notifyFailure("Couldn’t refresh sky", new Error(next.message));
              } else {
                setView(next);
              }
            } catch (error) {
              await notifyFailure("Couldn’t refresh sky", error);
            } finally {
              setLoading(false);
            }
          }}
        />
        <MenuBarExtra.Item
          title="Open Current Sky"
          icon={Icon.Sun}
          onAction={() => launchCommand({ name: "current-sky", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Change Location"
          icon={Icon.Pin}
          onAction={() => launchCommand({ name: "explore-sky", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={view?.enabled ? (view.paused ? "Resume Auto Update" : "Pause Auto Update") : "Enable Auto Update…"}
          icon={view?.enabled && !view.paused ? Icon.Pause : Icon.Play}
          onAction={async () => {
            if (!view?.enabled) return openExtensionPreferences();
            try {
              const paused = await toggleAutoPause();
              setView({ ...view, paused });
            } catch (error) {
              await notifyFailure("Couldn’t change automatic updates", error);
            }
          }}
        />
        <MenuBarExtra.Item title="Open Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
