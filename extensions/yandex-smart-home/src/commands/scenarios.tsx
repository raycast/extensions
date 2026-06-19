import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { YandexAuthGate } from "../auth/auth-views";
import { showFetchUserInfoError } from "../utils/utils";
import {
  getUserInfo,
  scenarioAction,
  type UserInfo,
  type ScenarioObject,
} from "../api/yandex-iot";

function ScenariosView({ token }: { token: string }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const info = await getUserInfo(token);
      setUserInfo(info);
    } catch (e) {
      showFetchUserInfoError(e);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const runScenario = useCallback(
    async (scenario: ScenarioObject) => {
      try {
        await scenarioAction(token, scenario.id);
        showToast({
          style: Toast.Style.Success,
          title: "Scenario Started",
          message: scenario.name,
        });
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to Run Scenario",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [token],
  );

  const scenarios = (userInfo?.scenarios ?? []).filter((s) => s.is_active);

  return (
    <List isLoading={loading} searchBarPlaceholder="Search scenarios">
      {scenarios.map((scenario) => (
        <List.Item
          key={scenario.id}
          icon={Icon.Play}
          title={scenario.name}
          subtitle="Scenario"
          actions={
            <ActionPanel>
              <Action
                title="Run Scenario"
                icon={Icon.Play}
                onAction={() => runScenario(scenario)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={fetchUserInfo}
              />
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ))}
      {!loading && scenarios.length === 0 && (
        <List.EmptyView
          icon={Icon.List}
          title="No active scenarios"
          description="Create scenarios in the Yandex app."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function ScenariosCommand() {
  return (
    <YandexAuthGate>
      {(token) => <ScenariosView token={token} />}
    </YandexAuthGate>
  );
}
