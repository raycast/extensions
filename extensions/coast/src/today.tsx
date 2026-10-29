import {
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createCoastLink,
  topApplications,
  totalScreenTime,
  type UsageItem,
  type UsageTotal,
} from "./coast";
import { today, duration } from "./dates";

type State = {
  total?: UsageTotal;
  applications: UsageItem[];
  isLoading: boolean;
  error?: string;
};

export default function Command() {
  const [state, setState] = useState<State>({
    applications: [],
    isLoading: true,
  });

  useEffect(() => {
    Promise.all([totalScreenTime(today()), topApplications(today(), 5)])
      .then(([total, applications]) =>
        setState({ total, applications, isLoading: false }),
      )
      .catch((error) =>
        setState({
          applications: [],
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
  }, []);

  async function openCoastNow() {
    await open(await createCoastLink("now"));
  }

  return (
    <MenuBarExtra
      icon={Icon.Clock}
      isLoading={state.isLoading}
      title={state.total ? duration(state.total.recorded_seconds) : undefined}
      tooltip="Coast Screen Time Today"
    >
      {state.error ? (
        <MenuBarExtra.Item title="Coast unavailable" subtitle={state.error} />
      ) : (
        <>
          <MenuBarExtra.Section title="Today">
            <MenuBarExtra.Item
              title="Total Screen Time"
              subtitle={state.total?.recorded_seconds_human || "No activity"}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Top Applications">
            {state.applications.map((application) => (
              <MenuBarExtra.Item
                key={application.identifier}
                title={application.display_name || application.identifier}
                subtitle={duration(application.recorded_seconds)}
              />
            ))}
          </MenuBarExtra.Section>
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Coast Activity"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "activity",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Coast Now"
          icon={Icon.Clock}
          onAction={openCoastNow}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
