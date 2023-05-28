import * as google from "./google";
export interface EmailDetails {
  from: string;
  subject: string;
  body: string;
  link: string;
  img?: string;
}

export interface SendMail {
  to: string;
  subject: string;
  body: string;
  scheduleTime?: Date;
  files?: string[];
}
export interface Service {
  authorize(): Promise<void>;
  fetchInboxEmails(): Promise<EmailDetails[]>;
  logout(): Promise<void>;
  sendEmail(email: SendMail): Promise<string | undefined>;
}
export function getService(serviceName: string): Service {
  switch (serviceName) {
    case "google":
      return google as Service;
    default:
      throw new Error("Unsupported service: " + serviceName);
  }
}
