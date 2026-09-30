import { Toast } from "@raycast/api";
import { NamedPortAlreadyExistsError } from "../hooks/useNamedPorts";

const Toasts = {
  EditNamedPort: {
    NotFound(port: number): Toast.Options {
      return {
        title: "Not Found",
        message: `Named port "${port}" not found`,
        style: Toast.Style.Failure,
      };
    },
    Success(name: string): Toast.Options {
      return {
        title: "Named Port Updated",
        message: `Named port "${name}" updated successfully`,
        style: Toast.Style.Success,
      };
    },
  },
  DeleteNamedPort: {
    Success(name: string): Toast.Options {
      return {
        title: "Named Port Deleted",
        message: `Named port "${name}" deleted successfully`,
        style: Toast.Style.Success,
      };
    },
  },
  CreateNamedPort: {
    Success(name: string): Toast.Options {
      return {
        title: "Named Port",
        message: `Named port "${name}" created successfully`,
        style: Toast.Style.Success,
      };
    },
    AlreadyExistsError(err: NamedPortAlreadyExistsError): Toast.Options {
      return {
        title: "Already Exists",
        message: err.message,
        style: Toast.Style.Failure,
      };
    },
  },
  KillProcess: {
    Error(e: unknown): Toast.Options {
      return {
        style: Toast.Style.Failure,
        title: `${(e as Error).message ?? e}`,
      };
    },
    Success(process: { name?: string; pid: number }): Toast.Options {
      return {
        style: Toast.Style.Success,
        title: "Killed Process",
        message: process.name ? `${process.name} (${process.pid})` : `${process.pid}`,
      };
    },
    Survived(process: { name?: string; pid: number }, forceKill?: () => void): Toast.Options {
      const label = process.name ? `${process.name} (${process.pid})` : `${process.pid}`;
      return {
        style: Toast.Style.Failure,
        title: "Process Still Running",
        message: `${label} did not exit after the signal`,
        primaryAction:
          forceKill === undefined
            ? undefined
            : {
                title: "Force Kill (SIGKILL)",
                onAction: (toast) => {
                  toast.hide();
                  forceKill();
                },
              },
      };
    },
  },
} as const;

export default Toasts;
