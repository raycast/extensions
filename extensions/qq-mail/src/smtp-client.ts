import nodemailer from "nodemailer";
import { getPreferenceValues } from "@raycast/api";

const QQ_SMTP_HOST = "smtp.qq.com";
const QQ_SMTP_PORT = 465;

function createTransporter(): nodemailer.Transporter {
  const prefs = getPreferenceValues();
  return nodemailer.createTransport({
    host: QQ_SMTP_HOST,
    port: QQ_SMTP_PORT,
    secure: true,
    auth: {
      user: prefs.username,
      pass: prefs.password,
    },
  });
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
  const prefs = getPreferenceValues();
  const transporter = createTransporter();

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
