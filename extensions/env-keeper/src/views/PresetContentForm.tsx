import type { Preset } from "@env-keeper/core";
import { t } from "../i18n.js";
import { RawContentForm } from "./RawContentForm.js";

interface PresetContentFormProps {
  preset: Preset;
  onSave: (content: string) => Promise<void>;
}

/** 直接改方案的内容。允许存成空:一份"清空所有变量"的方案也说得通 */
export function PresetContentForm({ preset, onSave }: PresetContentFormProps) {
  return (
    <RawContentForm
      navTitle={t("ps.contentNavTitle", { name: preset.name })}
      initialContent={preset.content}
      hint={t("ps.contentHint")}
      submitTitle={t("ps.submitEdit")}
      onSave={onSave}
    />
  );
}
