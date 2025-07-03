import { showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { piHoleAPI } from "./lib/api";

export default async function FlushLogs() {
  try {
    const confirmed = await confirmAlert({
      title: "Confirm Log Flush",
      message: "Are you sure you want to delete all query logs? This action cannot be undone.",
      primaryAction: {
        title: "Yes, Flush Logs",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
        style: Alert.ActionStyle.Cancel,
      },
    });

    if (!confirmed) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Limpiando registros...",
      message: "Eliminando todos los registros de consultas DNS",
    });

    await piHoleAPI.flushLogs();

    await showToast({
      style: Toast.Style.Success,
      title: "✅ Registros Limpiados",
      message: "Todos los registros de consultas han sido eliminados exitosamente",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Error",
      message: error instanceof Error ? error.message : "Error desconocido al limpiar registros",
    });
  }
}
