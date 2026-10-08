import { Email } from "./types";

// Demo mode replaces names, subjects and bodies, for screenshots and showing the extension to others

const DEMO_NAMES = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Williams",
  "David Brown",
  "Emma Davis",
  "Frank Miller",
  "Grace Wilson",
  "Henry Moore",
];

const DEMO_SUBJECTS = [
  "Meeting Follow-up",
  "Project Update",
  "Quick Question",
  "Weekly Report",
  "Action Required",
  "FYI: Important Notice",
  "Re: Your Request",
  "Invitation: Team Sync",
];

export const DEMO_BODY = `Hi there,

Thank you for your email. I wanted to follow up on our previous conversation regarding the project timeline.

Please let me know if you have any questions or concerns.

Best regards`;

export function anonymizeEmail(email: Email, index: number): Email {
  const nameIndex = index % DEMO_NAMES.length;
  const subjectIndex = index % DEMO_SUBJECTS.length;
  const demoName = DEMO_NAMES[nameIndex];
  const demoEmail = demoName.toLowerCase().replace(" ", ".") + "@example.com";

  return {
    ...email,
    subject: DEMO_SUBJECTS[subjectIndex],
    from: [{ name: demoName, address: demoEmail }],
    to: [{ name: "You", address: "you@example.com" }],
    cc: email.cc ? [{ name: DEMO_NAMES[(nameIndex + 1) % DEMO_NAMES.length], address: "cc@example.com" }] : undefined,
  };
}
