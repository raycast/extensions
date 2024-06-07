import { execSync } from "child_process";
import { APPLICATION_PATH } from "./constants";
import { Profile, Truthy } from "./types";

export function exec(cmd: string) {
  return execSync(`${APPLICATION_PATH} ${cmd}`);
}

export function formatDuration(seconds: number): string {
  const units = [
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];

  let remainingSeconds = seconds;
  const parts: string[] = [];

  for (const unit of units) {
    if (remainingSeconds >= unit.seconds) {
      const value = Math.floor(remainingSeconds / unit.seconds);
      remainingSeconds %= unit.seconds;
      parts.push(`${value} ${unit.label}${value !== 1 ? 's' : ''}`);
    }
  }

  return parts.length > 0 ? parts.join(' ') : '0 seconds';
}

export function truthy<T>(value: T): value is Truthy<T> {
  return !!value;
}

export function isProfileActive(profile: Profile) {
  return profile.connected || profile.run_state === 'Active' || profile.status === 'Connecting'
}
