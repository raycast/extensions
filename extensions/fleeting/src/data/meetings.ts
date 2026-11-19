export const MEETING_IDS = [
  "standup",
  "sales",
  "api",
  "appsec",
  "scoping",
  "pm",
  "vendor",
  "allhands",
  "incident",
  "gossip",
  "wellbeing",
  "flirt",
  "pilots",
  "ransomware",
] as const;

export type MeetingId = (typeof MEETING_IDS)[number];

export type MeetingCategory = "engineering" | "business" | "security" | "social" | "crisis";

export type Meeting = {
  id: MeetingId;
  title: string;
  description: string;
  keywords: string[];
  category: MeetingCategory;
};

export const DEFAULT_MEETING_ID: MeetingId = "standup";

export const MEETINGS: readonly Meeting[] = [
  {
    id: "standup",
    title: "Engineering Standup",
    description: "Round-robin updates, one unspoken blocker, a ticket that is almost done.",
    keywords: ["daily", "scrum", "agile", "sprint", "dev"],
    category: "engineering",
  },
  {
    id: "sales",
    title: "Client Sales Call",
    description: "A confident pitch, pricing questions, and a very flexible timeline.",
    keywords: ["client", "customer", "pitch", "deal", "pricing"],
    category: "business",
  },
  {
    id: "api",
    title: "API Design Review",
    description: "Endpoints, naming debates, and versioning opinions.",
    keywords: ["rest", "schema", "endpoint", "architecture", "engineering"],
    category: "engineering",
  },
  {
    id: "appsec",
    title: "AppSec Review",
    description: "Threat models, findings triage, and a dependency nobody owns.",
    keywords: ["security", "vulnerability", "threat", "pentest", "cve"],
    category: "security",
  },
  {
    id: "scoping",
    title: "Scoping Call",
    description: "Requirements, assumptions, and scope that quietly grows.",
    keywords: ["requirements", "estimate", "project", "planning", "discovery"],
    category: "business",
  },
  {
    id: "pm",
    title: "Project Status Meeting",
    description: "Green, amber, red, and creative interpretations of each.",
    keywords: ["status", "project", "manager", "roadmap", "timeline", "update"],
    category: "business",
  },
  {
    id: "vendor",
    title: "Vendor Security Review",
    description: "Questionnaires, certifications, and a pending SOC 2 report.",
    keywords: ["security", "questionnaire", "compliance", "soc2", "procurement"],
    category: "security",
  },
  {
    id: "allhands",
    title: "Quarterly All-Hands",
    description: "Company metrics, leadership updates, and a Q&A with pre-screened questions.",
    keywords: ["company", "town hall", "leadership", "quarterly", "keynote"],
    category: "business",
  },
  {
    id: "incident",
    title: "IT Incident War Room",
    description: "Something is down, everyone is investigating, and the cause is DNS.",
    keywords: ["outage", "sev1", "oncall", "postmortem", "dns", "downtime"],
    category: "crisis",
  },
  {
    id: "gossip",
    title: "Before the Host Joins",
    description: "Small talk and office chatter while waiting for the meeting to start.",
    keywords: ["waiting", "chat", "small talk", "watercooler", "early"],
    category: "social",
  },
  {
    id: "wellbeing",
    title: "Healthy Workplace Working Group",
    description: "Wellness initiatives, workload talk, and a proposal for walking meetings.",
    keywords: ["hr", "wellness", "culture", "committee", "burnout"],
    category: "social",
  },
  {
    id: "flirt",
    title: "Offsite Planning Sync",
    description: "Venues, logistics, and conversation with a little extra charm.",
    keywords: ["offsite", "event", "planning", "retreat", "romance", "flirty"],
    category: "social",
  },
  {
    id: "pilots",
    title: "Ops Weekly (Flight Deck Edition)",
    description: "Weekly operations review delivered with full cockpit etiquette.",
    keywords: ["aviation", "pilot", "operations", "flight", "captain", "ops"],
    category: "business",
  },
  {
    id: "ransomware",
    title: "Ransomware Crisis Bridge",
    description: "Encrypted files, executive concern, and a ransom note.",
    keywords: ["incident", "attack", "breach", "cyber", "security", "crisis"],
    category: "crisis",
  },
];

const BY_ID = new Map<string, Meeting>(MEETINGS.map((m) => [m.id, m]));

export function isMeetingId(value: unknown): value is MeetingId {
  return typeof value === "string" && BY_ID.has(value);
}

export function getMeeting(id: MeetingId): Meeting {
  return BY_ID.get(id) as Meeting;
}
