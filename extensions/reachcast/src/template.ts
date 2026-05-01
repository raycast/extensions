import { LocalStorage } from "@raycast/api";

const TEMPLATE_STORAGE_KEY = "email-template";

export type EmailTemplate = {
  subject: string;
  body: string;
};

export const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: "Lunch plan for {{day}}",
  body: `Hi {{name}},

I'm thinking about {{restaurant}} for lunch on {{day}}.

Does {{time}} work for you?

{{note}}

Thanks,
{{senderName}}`,
};

export async function getEmailTemplate() {
  const storedTemplate =
    await LocalStorage.getItem<string>(TEMPLATE_STORAGE_KEY);

  if (!storedTemplate) {
    return DEFAULT_TEMPLATE;
  }

  try {
    return {
      ...DEFAULT_TEMPLATE,
      ...JSON.parse(storedTemplate),
    } as EmailTemplate;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

export async function saveEmailTemplate(template: EmailTemplate) {
  await LocalStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
}

export async function resetEmailTemplate() {
  await saveEmailTemplate(DEFAULT_TEMPLATE);
}

export const TEMPLATE_PLACEHOLDERS =
  "{{name}}, {{day}}, {{restaurant}}, {{time}}, {{note}}, {{senderName}}, or any custom {{placeholderName}}";

export function getTemplatePlaceholders(template: EmailTemplate) {
  const placeholders = new Set<string>();
  const templateText = `${template.subject}\n${template.body}`;

  for (const match of templateText.matchAll(/{{(\w+)}}/g)) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}
