import {
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { setInterval } from "timers";
import { fetch } from "undici";
import { Machine } from "./machine";
import Style = Toast.Style;

export function usePaperspace<RESPONSE = unknown>(
  method: "GET" | "POST",
  apiUrl: string
) {
  const { paperspaceApiKey } = getPreferenceValues<Preferences.Index>();

  return useFetch<RESPONSE>(`https://api.paperspace.io${apiUrl}`, {
    execute: !!paperspaceApiKey,
    method,
    headers: {
      "x-api-key": paperspaceApiKey,
    },
    onError: (err) => {
      if (err.message === "Bad Request") {
        showToast({
          style: Style.Failure,
          title: "Could not connect to Paperspace",
          message: "Please check your API key in the extension's preferences.",
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: openExtensionPreferences,
          },
        }).then();
      }
    },
  });
}

function fetchPaperspace(method: "GET" | "POST", apiUrl: string) {
  const { paperspaceApiKey } = getPreferenceValues<Preferences.Index>();
  return fetch(`https://api.paperspace.io${apiUrl}`, {
    method,
    headers: {
      "x-api-key": paperspaceApiKey,
    },
  });
}

export const toggleMachine = (machine: Machine) => (): void => {
  if (machine.state === "off" || machine.state === "stopping") {
    startMachine(machine)();
  } else if (machine.state === "ready" || machine.state === "serviceready") {
    stopMachine(machine)();
  }
};

export const startMachine = (machine: Machine) => (): void => {
  fetchPaperspace("POST", `/machines/${machine.id}/start`)
    .then(() =>
      showToast({
        title: "Starting",
        message: `${machine.name} is starting`,
        style: Style.Animated,
      })
    )
    .then((toast) => {
      const interval = setInterval(() => {
        fetchPaperspace(
          "GET",
          `/machines/getMachinePublic?machineId=${machine.id}`
        )
          .then((it) => it.json() as Promise<Machine>)
          .then((machine) => {
            if (machine.state === "ready" || machine.state === "serviceready") {
              clearInterval(interval);
              return toast.hide();
            }
          });
      }, 1000);
    });
};

export const stopMachine = (machine: Machine) => (): void => {
  fetchPaperspace("POST", `/machines/${machine.id}/stop`)
    .then(() =>
      showToast({
        title: "Stopping",
        message: `${machine.name} is stopping`,
        style: Style.Animated,
      })
    )
    .then((toast) => {
      const interval = setInterval(() => {
        fetchPaperspace(
          "GET",
          `/machines/getMachinePublic?machineId=${machine.id}`
        )
          .then((it) => it.json() as Promise<Machine>)
          .then((machine) => {
            if (machine.state === "off") {
              clearInterval(interval);
              return toast.hide();
            }
          });
      }, 1000);
    });
};

export const restartMachine = (machine: Machine) => (): void => {
  fetchPaperspace("POST", `/machines/${machine.id}/restart`)
    .then(() =>
      showToast({
        title: "Restarting",
        message: `${machine.name} is restarting`,
        style: Style.Animated,
      })
    )
    .then((toast) => {
      const interval = setInterval(() => {
        fetchPaperspace(
          "GET",
          `/machines/getMachinePublic?machineId=${machine.id}`
        )
          .then((it) => it.json() as Promise<Machine>)
          .then((machine) => {
            if (machine.state === "ready") {
              clearInterval(interval);
              return toast.hide();
            }
          });
      }, 1000);
    });
};
