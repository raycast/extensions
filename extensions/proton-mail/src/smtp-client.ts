import nodemailer from "nodemailer";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

// Check if host is localhost (safe for unencrypted local connections)
function isLocalhostHost(host: string): boolean {
  const localhostPatterns = ["127.0.0.1", "localhost", "::1", "0.0.0.0"];
  return localhostPatterns.includes(host.toLowerCase());
}

// Track if we've shown the security warning this session
let smtpSecurityWarningShown = false;

let transporterInstance: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  const prefs = getPreferenceValues<Preferences>();

  // Warn user if connecting to non-localhost (potential security risk)
  if (!isLocalhostHost(prefs.smtpHost) && !smtpSecurityWarningShown) {
    smtpSecurityWarningShown = true;
    showToast({
      style: Toast.Style.Failure,
      title: "Security Warning",
      message: `Connecting to non-localhost SMTP host "${prefs.smtpHost}" may expose your credentials. Proton Mail Bridge should only run on localhost.`,
    });
  }

  if (transporterInstance) {
    return transporterInstance;
  }

  transporterInstance = nodemailer.createTransport({
    host: prefs.smtpHost,
    port: parseInt(prefs.smtpPort, 10),
    secure: true, // SSL for Proton Bridge SMTP
    auth: {
      user: prefs.username,
      pass: prefs.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporterInstance;
}

export interface SendEmailOptions {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const transporter = getTransporter();

  await transporter.sendMail({
    from: prefs.username,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    html: options.html,
    inReplyTo: options.inReplyTo,
    references: options.references,
  });
}

export async function replyToEmail(
  originalFrom: string,
  originalSubject: string,
  originalMessageId: string,
  replyBody: string,
  replyAll?: { cc?: string },
): Promise<void> {
  const subject = originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`;

  await sendEmail({
    to: originalFrom,
    cc: replyAll?.cc,
    subject,
    text: replyBody,
    inReplyTo: originalMessageId,
    references: originalMessageId,
  });
}

export async function forwardEmail(
  to: string,
  originalSubject: string,
  originalBody: string,
  forwardNote?: string,
): Promise<void> {
  const subject = originalSubject.startsWith("Fwd:") ? originalSubject : `Fwd: ${originalSubject}`;

  const body = forwardNote
    ? `${forwardNote}\n\n---------- Forwarded message ----------\n\n${originalBody}`
    : `---------- Forwarded message ----------\n\n${originalBody}`;

  await sendEmail({
    to,
    subject,
    text: body,
  });
}
