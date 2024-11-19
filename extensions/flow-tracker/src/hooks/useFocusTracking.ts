import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { FocusLog, Session } from "../types/index";
import { getFocusLog, saveFocusLog, getPersonalBest, savePersonalBest } from "../utils/storage";

export const useFocusTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [focusLog, setFocusLog] = useState<FocusLog | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const savedLog = await getFocusLog();
    const savedBest = await getPersonalBest();

    if (savedLog) {
      setFocusLog(savedLog);
      if (savedLog.lastStart) {
        setIsTracking(true);
      }
    }

    if (savedBest) {
      setPersonalBest(savedBest);
    }
  };

  const startTracking = async () => {
    try {
      const now = Date.now();
      const updatedLog: FocusLog = focusLog
        ? { ...focusLog, lastStart: now }
        : { totalTime: 0, lastStart: now, dailyLogs: [] };

      await saveFocusLog(updatedLog);
      setFocusLog(updatedLog);
      setIsTracking(true);
      showToast(Toast.Style.Success, "Flow session started");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to start session");
    }
  };

  const stopTracking = async () => {
    if (!focusLog?.lastStart) return;

    try {
      const now = Date.now();
      const sessionDuration = Math.floor((now - focusLog.lastStart) / 1000);
      const today = new Date().toISOString().split("T")[0];

      const newSession: Session = {
        id: uuidv4(),
        startTime: focusLog.lastStart,
        endTime: now,
        duration: sessionDuration,
        date: today,
      };

      // Update personal best if needed
      if (!personalBest || sessionDuration > personalBest) {
        await savePersonalBest(sessionDuration);
        setPersonalBest(sessionDuration);
        showToast(Toast.Style.Success, "New personal best!");
      }

      // Update focus log
      const updatedLog = updateFocusLogWithSession(focusLog, newSession);
      await saveFocusLog(updatedLog);
      setFocusLog(updatedLog);
      setIsTracking(false);
      showToast(Toast.Style.Success, "Flow session completed");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to stop session");
    }
  };

  const updateFocusLogWithSession = (currentLog: FocusLog, newSession: Session): FocusLog => {
    const dailyLogIndex = currentLog.dailyLogs.findIndex((log) => log.date === newSession.date);
    const updatedDailyLogs = [...currentLog.dailyLogs];

    if (dailyLogIndex >= 0) {
      updatedDailyLogs[dailyLogIndex].sessions.push(newSession);
      updatedDailyLogs[dailyLogIndex].time += newSession.duration;
    } else {
      updatedDailyLogs.push({
        date: newSession.date,
        time: newSession.duration,
        sessions: [newSession],
        activities: [],
      });
    }

    return {
      totalTime: currentLog.totalTime + newSession.duration,
      lastStart: null,
      dailyLogs: updatedDailyLogs,
    };
  };

  const resetLogs = async () => {
    try {
      const emptyLog: FocusLog = {
        totalTime: 0,
        lastStart: null,
        dailyLogs: [],
      };
      await saveFocusLog(emptyLog);
      await savePersonalBest(0);
      setFocusLog(emptyLog);
      setPersonalBest(null);
      setIsTracking(false);
      showToast(Toast.Style.Success, "All logs cleared");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to clear logs");
    }
  };

  return {
    isTracking,
    focusLog,
    personalBest,
    startTracking,
    stopTracking,
    resetLogs,
  };
};
