import { immer } from "zustand/middleware/immer";
import { create } from "zustand";
import { Monitor, Heartbeat, Uptime, AvgPing, HeartbeatList } from "../modules/UptimeKuma";

interface AppState {
  monitors: Array<Monitor>;
  setMonitors: (monitors: Array<Monitor>) => void;
  clearMonitors: () => void;
  updateMonitor: (monitor: Monitor) => void;
  updateMonitorHeartbeat: (heartbeat: Heartbeat) => void;
  updateMonitorHeartbeatList: (heartbeatList: HeartbeatList) => void;
  updateMonitorAvgPing: (avgPing: AvgPing) => void;
  updateMonitorUptime: (uptime: Uptime) => void;
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    monitors: [],
    setMonitors: (monitors: Array<Monitor>) =>
      set((state) => {
        // only copy new properties to keep added properties

        state.monitors = monitors.map((monitor) => {
          const existing = state.monitors.find((m) => m.id === monitor.id);
          if (existing) {
            return {
              ...existing,
              ...monitor,
            };
          }
          return monitor;
        });

        // delete removed monitors

        state.monitors = state.monitors.filter((monitor) => {
          return monitors.find((m) => m.id === monitor.id);
        });
      }),
    updateMonitorHeartbeat: (heartbeat: Heartbeat) =>
      set((state) => {
        state.monitors = state.monitors.map((monitor) => {
          if (monitor.id === parseInt(heartbeat.monitorID)) {
            return {
              ...monitor,
              heartbeat,
            };
          }

          return monitor;
        });
      }),
    updateMonitorHeartbeatList: (heartbeatList: HeartbeatList) =>
      set((state) => {
        state.monitors = state.monitors.map((monitor) => {
          if (monitor.id == parseInt(heartbeatList.monitorID)) {
            return {
              ...monitor,
              heartbeats: heartbeatList.heartbeatList,
              heartbeat: heartbeatList.heartbeatList[0],
            };
          }

          return monitor;
        });
      }),
    updateMonitorAvgPing: (avgPing: AvgPing) =>
      set((state) => {
        state.monitors = state.monitors.map((monitor) => {
          if (monitor.id === parseInt(avgPing.monitorID)) {
            return {
              ...monitor,
              avgPing: avgPing.avgPing,
            };
          }
          return monitor;
        });
      }),
    updateMonitorUptime: (uptime: Uptime) =>
      set((state) => {
        state.monitors = state.monitors.map((monitor) => {
          if (monitor.id === parseInt(uptime.monitorID)) {
            if (uptime.period === 24) {
              return {
                ...monitor,
                uptime24: uptime.percent * 100,
              };
            } else if (uptime.period === 720) {
              return {
                ...monitor,
                uptime720: uptime.percent * 100,
              };
            }
          }
          return monitor;
        });
      }),

    clearMonitors: () =>
      set((state) => {
        state.monitors = [];
      }),
    updateMonitor: (monitor: Monitor) =>
      set((state) => {
        state.monitors = state.monitors.map((m) => {
          if (m.id === monitor.id) {
            return monitor;
          }
          return m;
        });
      }),
  })),
);

export default useAppStore;
