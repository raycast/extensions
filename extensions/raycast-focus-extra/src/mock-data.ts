import { FocusSession } from "./types";

const MOCK_TEMPLATES: { title: string; start: Date; end: Date; durationMinutes: number }[] = [
  {
    title: "Deep work – API design",
    start: new Date("2000-01-01T09:00:00"),
    end: new Date("2000-01-01T10:00:00"),
    durationMinutes: 60,
  },
  {
    title: "Code review PRs",
    start: new Date("2000-01-01T10:30:00"),
    end: new Date("2000-01-01T11:15:00"),
    durationMinutes: 45,
  },
  {
    title: "Write docs",
    start: new Date("2000-01-01T14:00:00"),
    end: new Date("2000-01-01T14:25:00"),
    durationMinutes: 25,
  },
  {
    title: "Focus – bug triage",
    start: new Date("2000-01-01T09:30:00"),
    end: new Date("2000-01-01T10:30:00"),
    durationMinutes: 60,
  },
  {
    title: "Implement auth flow",
    start: new Date("2000-01-01T11:00:00"),
    end: new Date("2000-01-01T12:30:00"),
    durationMinutes: 90,
  },
  {
    title: "Email & Slack",
    start: new Date("2000-01-01T15:00:00"),
    end: new Date("2000-01-01T15:45:00"),
    durationMinutes: 45,
  },
  {
    title: "Sprint planning prep",
    start: new Date("2000-01-01T08:00:00"),
    end: new Date("2000-01-01T09:00:00"),
    durationMinutes: 60,
  },
  {
    title: "Focus – refactor storage",
    start: new Date("2000-01-01T10:00:00"),
    end: new Date("2000-01-01T10:25:00"),
    durationMinutes: 25,
  },
  {
    title: "Focus – refactor storage",
    start: new Date("2000-01-01T10:35:00"),
    end: new Date("2000-01-01T11:35:00"),
    durationMinutes: 60,
  },
  {
    title: "Read & research",
    start: new Date("2000-01-01T16:00:00"),
    end: new Date("2000-01-01T17:00:00"),
    durationMinutes: 60,
  },
];

function setTimeOnDate(base: Date, ref: Date): Date {
  const d = new Date(base);
  d.setHours(ref.getHours(), ref.getMinutes(), ref.getSeconds(), ref.getMilliseconds());
  return d;
}

export function getMockFocusSessions(): FocusSession[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return MOCK_TEMPLATES.map(({ title, start, end, durationMinutes }) => ({
    title,
    start: setTimeOnDate(today, start),
    end: setTimeOnDate(today, end),
    durationMinutes,
  })).sort((a, b) => a.start.getTime() - b.start.getTime());
}
