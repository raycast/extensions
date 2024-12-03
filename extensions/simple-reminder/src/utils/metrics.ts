import { exec } from "child_process";
import { captureException, LocalStorage } from "@raycast/api";
import { buildException } from "./buildException";

export const METRIC_CLIENT_ID_STORAGE_KEY = "metricsClientId";

export enum METRIC_TYPE {
  REMINDER_TRIGGERED = "REMINDER_TRIGGERED",
  REMINDER_DELETED = "REMINDER_DELETED",
  REMINDER_COPIED = "REMINDER_COPIED",
  REMINDER_FREQUENCY_CHANGED = "REMINDER_FREQUENCY_CHANGED",
  MOBILE_NOTIFICATION_TRIGGERED = "MOBILE_NOTIFICATION_TRIGGERED",
}

const collectMetricCurlCommand = (
  clientId: string,
  type: METRIC_TYPE,
) => `curl -i --location --request POST 'https://tmylkxbwlnvqhogabriz.supabase.co/functions/v1/register-metric' \
    --header 'Content-Type: application/json' \
    --data '{ "clientId": "${clientId}", "type": "${type}" }'`;

export async function collectMetric(type: METRIC_TYPE) {
  const clientId = await LocalStorage.getItem<string>(METRIC_CLIENT_ID_STORAGE_KEY);

  if (!clientId) {
    return assignMetricsClientId();
  }

  try {
    exec(collectMetricCurlCommand(clientId, type), (err) => {
      if (err) {
        console.error("Metric collection serverless function connection failed", err);
        return;
      }
    });
  } catch (error) {
    captureException(
      buildException(error as Error, "Error collecting metric", {
        clientId,
        type,
      }),
    );
  }
}

const assignMetricsClientIdCurlCommand = () => `curl -i --location \
    --request GET 'https://tmylkxbwlnvqhogabriz.supabase.co/functions/v1/assign-client-id' \
    --header 'Content-Type: application/json'`;

function assignMetricsClientId() {
  try {
    exec(assignMetricsClientIdCurlCommand(), async (err, stdout, stderr) => {
      if (err) {
        console.error("Metric collection serverless function connection failed", err);
        return;
      }

      const jsonMatch = stdout.match(/\{.*\}/)!;
      const jsonResponse = jsonMatch[0];
      await LocalStorage.setItem(METRIC_CLIENT_ID_STORAGE_KEY.toString(), JSON.parse(jsonResponse).clientId);
    });
  } catch (error) {
    captureException(buildException(error as Error, "Error assigning metrics client id"));
  }
}
