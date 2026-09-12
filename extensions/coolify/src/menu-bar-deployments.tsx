import {
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import useDeploymentHistory from "./lib/use-deployment-history";
import { generateCoolifyUrl } from "./lib/utils";

const DEFAULT_MAX_DEPLOYMENTS = 10;

export default function MenuBarDeployments() {
  const { maxDeployments } = getPreferenceValues<Preferences.MenuBarDeployments>();
  const configuredLimit = maxDeployments ? Number.parseInt(maxDeployments, 10) : Number.NaN;
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : DEFAULT_MAX_DEPLOYMENTS;
  const { isLoading, data = [] } = useDeploymentHistory(limit);
  const deployments = data.slice(0, limit);

  return (
    <MenuBarExtra isLoading={isLoading} icon="coolify.png" tooltip="Recent Deployments">
      <MenuBarExtra.Section title="Recent Deployments">
        {deployments.length === 0 && !isLoading ? (
          <MenuBarExtra.Item title="No deployments found" />
        ) : (
          deployments.map((deployment) => (
            <MenuBarExtra.Item
              key={deployment.deployment_uuid}
              title={deployment.application_name}
              subtitle={`${deployment.status} • ${formatRelativeTime(deployment.created_at)}`}
              icon={getDeploymentIcon(deployment.status)}
              onAction={() => open(generateCoolifyUrl(deployment.deployment_url).toString())}
            />
          ))
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Settings"
          shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
          onAction={() => openCommandPreferences()}
        />
        <MenuBarExtra.Item
          title="Open in Raycast"
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={async () => {
            try {
              await launchCommand({ name: "search-deployments", type: LaunchType.UserInitiated });
            } catch {
              // Command not found.
            }
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function getDeploymentIcon(status: string) {
  switch (status.toLowerCase()) {
    case "finished":
    case "success":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "queued":
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
    case "in_progress":
    case "running":
      return { source: Icon.Dot, tintColor: Color.Orange };
    case "failed":
    case "error":
    case "cancelled":
    case "cancelled-by-user":
      return { source: Icon.Dot, tintColor: Color.Red };
    default:
      return Icon.QuestionMark;
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ] as const;
  const [unit, divisor] = units.find(([, divisor]) => Math.abs(seconds) >= divisor) ?? ["second", 1];

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(seconds / divisor), unit);
}
