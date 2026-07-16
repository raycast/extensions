import { LocalStorage } from "@raycast/api";

const TEMPLATE_STORAGE_KEY = "compose-templates";

export type ComposeTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

const DEFAULT_TEMPLATES: ComposeTemplate[] = [
  {
    id: "thanks",
    name: "收到，谢谢",
    subject: "Re:",
    body: "收到，谢谢。\n\n",
  },
  {
    id: "follow-up",
    name: "跟进一下",
    subject: "跟进：",
    body: "你好，\n\n我想跟进一下这件事。方便时麻烦回复我一下，谢谢。\n\n",
  },
  {
    id: "materials",
    name: "发送材料",
    subject: "材料发送",
    body: "你好，\n\n相关材料如下：\n\n\n谢谢。\n",
  },
];

export async function getTemplates(): Promise<ComposeTemplate[]> {
  const stored = await LocalStorage.getItem<string>(TEMPLATE_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_TEMPLATES;
  }

  try {
    const parsed = JSON.parse(stored) as ComposeTemplate[];
    return parsed.length ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export async function saveTemplate(template: ComposeTemplate): Promise<void> {
  const templates = await getTemplates();
  const next = [template, ...templates.filter((item) => item.id !== template.id)].slice(0, 12);
  await LocalStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
}
