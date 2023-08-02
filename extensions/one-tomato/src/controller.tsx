import { Cache } from "@raycast/api";

const cache = new Cache();
const cacheKey = "one-tomato";

const currentTimestamp = () => new Date().valueOf();

export function createSession(type: "focus" | "shortBreak" | "longBreak") {
  let duration;
  if (type === "focus") {
    duration = 25 * 60 * 1000;
  } else if (type === "shortBreak") {
    duration = 5 * 60 * 1000;
  } else if (type === "longBreak") {
    duration = 15 * 60 * 1000;
  } else {
    throw new Error("Invalid session type");
  }

  const session = {
    start: currentTimestamp(),
    end: currentTimestamp() + duration,
    duration: 0,
    type,
    isPaused: false,
  };
  cache.set(cacheKey, JSON.stringify(session));
  return session;
}

export function getSession() {
  const session = cache.get(cacheKey);
  return session ? JSON.parse(session) : null;
}

export function isSessionActive() {
  const session = getSession();
  if (session) {
    return session.end > currentTimestamp();
  }
  return false;
}

export function getSessionRemainingTime() {
  const session = getSession();
  if (session) {
    if (session.isPaused) {
      return session.end - session.start - session.duration;
    }
    return session.end - currentTimestamp();
  }
  return 0;
}

export function pauseSession() {
  const session = getSession();
  if (session && !session.isPaused) {
    session.duration = currentTimestamp() - session.start;
    session.isPaused = true;
    cache.set(cacheKey, JSON.stringify(session));
  }
}

export function resumeSession() {
  const session = getSession();
  if (session && session.isPaused) {
    session.end = currentTimestamp() + getSessionRemainingTime();
    session.isPaused = false;
    cache.set(cacheKey, JSON.stringify(session));
  }
}

export function resetSession() {
  cache.remove(cacheKey);
}
