import fetch from "node-fetch";

export async function setSnooze(token: string, minutes: number) {
  const response = await fetch("https://slack.com/api/dnd.setSnooze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      num_minutes: minutes,
    }),
  });

  const data = await response.json();
  return data;
}

export async function endSnooze(token: string) {
  const response = await fetch("https://slack.com/api/dnd.endSnooze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
}

export async function setStatus(token: string, statusText: string, statusEmoji: string, minutes: number) {
  const expirationTimestamp = Math.ceil(Date.now() / 1000) + minutes * 60;

  const response = await fetch("https://slack.com/api/users.profile.set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      profile: {
        status_text: statusText,
        status_emoji: statusEmoji,
        status_expiration: expirationTimestamp,
      },
    }),
  });

  const data = await response.json();
  return data;
}

export async function clearStatus(token: string) {
  const response = await fetch("https://slack.com/api/users.profile.set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      profile: {
        status_text: "",
        status_emoji: "",
        status_expiration: 0,
      },
    }),
  });

  const data = await response.json();
  return data;
}
