import { DexContact } from "./types";

export function getContactDisplayName(contact: DexContact): string {
  const firstName = contact.first_name || "";
  const lastName = contact.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  if (contact.emails && contact.emails.length > 0) {
    return contact.emails[0].email;
  }

  return "Unnamed Contact";
}

export function getContactSubtitle(contact: DexContact): string {
  const jobTitle = contact.job_title || "";
  return jobTitle || "No job title";
}

export function formatContactDetails(contact: DexContact): string {
  const sections: string[] = [];

  // Header with name
  sections.push(`# ${getContactDisplayName(contact)}`);
  sections.push("");

  // Job title prominently displayed
  if (contact.job_title) {
    sections.push(`### ${contact.job_title}`);
    sections.push("");
  }

  // Overview section at the top
  sections.push("## 📋 Quick Overview");
  sections.push("");

  const overviewItems: string[] = [];

  if (contact.emails && contact.emails.length > 0) {
    overviewItems.push(`**📧 Email:** ${contact.emails[0].email}`);
  }

  if (contact.phones && contact.phones.length > 0) {
    overviewItems.push(`**📱 Phone:** ${contact.phones[0].phone_number}`);
  }

  if (contact.linkedin) {
    const linkedinDisplay = contact.linkedin.startsWith("http")
      ? contact.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "@")
      : `@${contact.linkedin}`;
    overviewItems.push(`**💼 LinkedIn:** ${linkedinDisplay}`);
  }

  if (contact.website) {
    const websiteDisplay = contact.website.replace(/https?:\/\/(www\.)?/, "");
    overviewItems.push(`**🌐 Website:** ${websiteDisplay}`);
  }

  sections.push(overviewItems.join("\n\n"));
  sections.push("");
  sections.push("---");
  sections.push("");

  // Contact Information section
  if ((contact.emails && contact.emails.length > 1) || (contact.phones && contact.phones.length > 1)) {
    sections.push("## 📇 Contact Information");
    sections.push("");

    if (contact.emails && contact.emails.length > 1) {
      sections.push("**Email Addresses:**");
      contact.emails.forEach((email, index) => {
        sections.push(`${index + 1}. ${email.email}`);
      });
      sections.push("");
    }

    if (contact.phones && contact.phones.length > 1) {
      sections.push("**Phone Numbers:**");
      contact.phones.forEach((phone, index) => {
        sections.push(`${index + 1}. ${phone.phone_number}`);
      });
      sections.push("");
    }

    sections.push("---");
    sections.push("");
  }

  // Social Media section
  const socialMedia = [];
  if (contact.twitter) socialMedia.push(`**Twitter:** ${contact.twitter}`);
  if (contact.facebook) socialMedia.push(`**Facebook:** ${contact.facebook}`);
  if (contact.instagram) socialMedia.push(`**Instagram:** ${contact.instagram}`);
  if (contact.telegram) socialMedia.push(`**Telegram:** ${contact.telegram}`);

  if (socialMedia.length > 0) {
    sections.push("## 🌐 Social Media");
    sections.push("");
    sections.push(socialMedia.join("\n\n"));
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  // Notes section
  if (contact.description) {
    sections.push("## 📝 Notes");
    sections.push("");
    sections.push(contact.description);
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  // Metadata section
  const metadata: string[] = [];
  if (contact.last_seen_at) {
    metadata.push(
      `**Last Seen:** ${new Date(contact.last_seen_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
    );
  }
  if (contact.created_at) {
    metadata.push(
      `**Created:** ${new Date(contact.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
    );
  }
  if (contact.updated_at) {
    metadata.push(
      `**Last Updated:** ${new Date(contact.updated_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
    );
  }

  if (metadata.length > 0) {
    sections.push("## ⏰ Timeline");
    sections.push("");
    sections.push(metadata.join("\n\n"));
  }

  return sections.join("\n");
}

export function getContactInitials(contact: DexContact): string {
  const firstName = contact.first_name || "";
  const lastName = contact.last_name || "";

  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }

  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }

  if (lastName) {
    return lastName.slice(0, 2).toUpperCase();
  }

  if (contact.emails && contact.emails.length > 0) {
    return contact.emails[0].email.slice(0, 2).toUpperCase();
  }

  return "??";
}
