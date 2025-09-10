import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { Monitor } from "../types";
import { API_BASE_URL } from "../constants";
import { useState } from "react";

export function useMonitorActions(apiKey: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate } = useFetch<{ data: Monitor[] }>(`${API_BASE_URL}/monitors`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    execute: false, // We don't want to fetch here, just use the mutate function
  });

  const createMonitor = async (monitorData: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/monitors`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(monitorData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`;

        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Monitor",
          message: errorMessage,
        });

        throw new Error(errorMessage);
      }

      const monitor = await response.json();

      // Optimistically add the new monitor to the list
      await mutate(Promise.resolve({ data: [monitor] }), {
        optimisticUpdate: (data) => {
          if (!data?.data) return data;
          return {
            ...data,
            data: [...data.data, monitor],
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Monitor Created",
        message: `Successfully created monitor "${monitor.name}"`,
      });

      return monitor;
    } catch (error: unknown) {
      // Only show toast if it's not already shown (for API errors)
      if (!(error instanceof Error && error.message.includes("HTTP"))) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Monitor",
          message: errorMessage,
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const pauseMonitor = async (monitorId: number, monitorName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/monitors/${monitorId}/pause`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`;

        await showToast({
          style: Toast.Style.Failure,
          title: "Pause Failed",
          message: errorMessage,
        });

        throw new Error(errorMessage);
      }

      await mutate(Promise.resolve(response), {
        optimisticUpdate: (data) => {
          if (!data?.data) return data;
          return {
            ...data,
            data: data.data.map((monitor) =>
              monitor.id === monitorId ? { ...monitor, paused: true } : monitor,
            ),
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Monitor Paused",
        message: `Successfully paused "${monitorName}"`,
      });
    } catch (error: unknown) {
      // Only show toast if it's not already shown (for API errors)
      if (!(error instanceof Error && error.message.includes("HTTP"))) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to pause monitor";
        await showToast({
          style: Toast.Style.Failure,
          title: "Pause Failed",
          message: errorMessage,
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resumeMonitor = async (monitorId: number, monitorName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/monitors/${monitorId}/resume`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`;

        await showToast({
          style: Toast.Style.Failure,
          title: "Resume Failed",
          message: errorMessage,
        });

        throw new Error(errorMessage);
      }

      await mutate(Promise.resolve(response), {
        optimisticUpdate: (data) => {
          if (!data?.data) return data;
          return {
            ...data,
            data: data.data.map((monitor) =>
              monitor.id === monitorId
                ? { ...monitor, paused: false }
                : monitor,
            ),
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Monitor Resumed",
        message: `Successfully resumed "${monitorName}"`,
      });
    } catch (error: unknown) {
      // Only show toast if it's not already shown (for API errors)
      if (!(error instanceof Error && error.message.includes("HTTP"))) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to resume monitor";
        await showToast({
          style: Toast.Style.Failure,
          title: "Resume Failed",
          message: errorMessage,
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMonitor = async (monitorId: number, monitorName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/monitors/${monitorId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message ||
          `HTTP ${response.status}: ${response.statusText}`;

        await showToast({
          style: Toast.Style.Failure,
          title: "Delete Failed",
          message: errorMessage,
        });

        throw new Error(errorMessage);
      }

      await mutate(Promise.resolve(response), {
        optimisticUpdate: (data) => {
          if (!data?.data) return data;
          return {
            ...data,
            data: data.data.filter((monitor) => monitor.id !== monitorId),
          };
        },
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Monitor Deleted",
        message: `Successfully deleted "${monitorName}"`,
      });
    } catch (error: unknown) {
      // Only show toast if it's not already shown (for API errors)
      if (!(error instanceof Error && error.message.includes("HTTP"))) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to delete monitor";
        await showToast({
          style: Toast.Style.Failure,
          title: "Delete Failed",
          message: errorMessage,
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createMonitor,
    pauseMonitor,
    resumeMonitor,
    deleteMonitor,
    isLoading,
  };
}
