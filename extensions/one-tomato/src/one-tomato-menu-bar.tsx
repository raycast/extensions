import { MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";
import { useState } from "react";
import {
  createSession,
  getSession,
  isSessionActive,
  pauseSession,
  resumeSession,
  resetSession,
  getSessionRemainingTime,
} from "./controller";
import { millisecondsToMinutesAndSeconds, millisecondsToMinutes, progressPercentage } from "./utils";

export default function OneTomatoMenuBar() {
  // title is the remaining time of the session, it is updated every 1000ms due to Raycast background refresh interval limitation
  const [title, setTitle] = useState(isSessionActive() ? millisecondsToMinutes(getSessionRemainingTime()) : "");

  // set icon according to the progress percentage
  let icon = Icon.Circle;

  if (isSessionActive()) {
    if (progressPercentage() > 0 && progressPercentage() < 25) {
      icon = Icon.CircleProgress25;
    } else if (progressPercentage() >= 25 && progressPercentage() < 50) {
      icon = Icon.CircleProgress50;
    } else if (progressPercentage() >= 50 && progressPercentage() < 75) {
      icon = Icon.CircleProgress75;
    } else if (progressPercentage() >= 75 && progressPercentage() < 100) {
      icon = Icon.CircleProgress100;
    }
  } else if (getSession() && !isSessionActive()) {
    launchCommand({
      name: "finish",
      type: LaunchType.UserInitiated,
    });
    icon = Icon.Emoji;
  }

  // reset session when the menu bar is clicked, session is finished
  if (getSession() && !isSessionActive() && LaunchType.UserInitiated) {
    resetSession();
  }

  // setTitle immediately when handling onAction to show the remaining time make it more responsive in visual, otherwise it will be updated in the next render
  const handleCreateSession = (type: "focus" | "shortBreak" | "longBreak") => {
    createSession(type);
    setTitle(millisecondsToMinutes(getSessionRemainingTime()));
  };

  const handlePauseSession = () => {
    pauseSession();
    setTitle(millisecondsToMinutes(getSessionRemainingTime()));
  };

  const handleResumeSession = () => {
    resumeSession();
    setTitle(millisecondsToMinutes(getSessionRemainingTime()));
  };

  const handleResetSession = () => {
    resetSession();
    setTitle("");
    icon = Icon.Circle;
  };

  return (
    <MenuBarExtra icon={icon} title={title}>
      {!isSessionActive() ? (
        <>
          <MenuBarExtra.Section title="Pomodoro">
            <MenuBarExtra.Item
              title="Start Focus"
              subtitle="25 minutes"
              shortcut={{ modifiers: ["opt"], key: "p" }}
              icon={"🍅"}
              onAction={() => handleCreateSession("focus")}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Break">
            <MenuBarExtra.Item
              title="Start Short Break"
              subtitle="5 minutes"
              shortcut={{ modifiers: ["opt"], key: "s" }}
              icon={"☕️"}
              onAction={() => handleCreateSession("shortBreak")}
            />
            <MenuBarExtra.Item
              title="Start Long Break"
              subtitle="15 minutes"
              shortcut={{ modifiers: ["opt"], key: "l" }}
              icon={"🏝️"}
              onAction={() => handleCreateSession("longBreak")}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <>
          <MenuBarExtra.Section title="Remaining Time">
            <MenuBarExtra.Item title={millisecondsToMinutesAndSeconds(getSessionRemainingTime())} icon={Icon.Clock} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Control">
            {getSession().isPaused ? (
              <MenuBarExtra.Item
                title="Resume"
                shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
                icon={Icon.Play}
                onAction={() => handleResumeSession()}
              />
            ) : (
              <MenuBarExtra.Item
                title="Pause"
                shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
                icon={Icon.Pause}
                onAction={() => handlePauseSession()}
              />
            )}
            <MenuBarExtra.Item
              title="Finish"
              shortcut={{ modifiers: ["cmd", "opt"], key: "f" }}
              icon={Icon.Stop}
              onAction={() => handleResetSession()}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
