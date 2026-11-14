import { Form } from "@raycast/api";
import { useState } from "react";
import { t } from "../i18n.js";

/**
 * 表单里"分组"的填写方式(设计决议 §十一.6),方案和 Shell 片段共用:
 * Raycast 表单没有"既能选又能打字"的控件,所以拆成两个——下拉框列出已有分组,
 * 文本框用来新建;文本框填了就以它为准。这样填的时候看得到现在有哪些分组,不会瞎打字造出一堆同义的组。
 *
 * 返回 `group`(裁剪后的结果,空 = 不分组)和要塞进 <Form> 的两个控件。
 */
export function useGroupFields(initialGroup: string | undefined, existingGroups: string[]) {
  // 已有分组不在列表里(比如刚被别的条目改没了)时,当成"新建"填进文本框,别悄悄丢掉
  const initial = initialGroup ?? "";
  const initialInList = initial !== "" && existingGroups.includes(initial);
  const [selectedGroup, setSelectedGroup] = useState(initialInList ? initial : "");
  const [newGroup, setNewGroup] = useState(initialInList ? "" : initial);

  const group = newGroup.trim() || selectedGroup || undefined;

  const fields = (
    <>
      {/* 下拉框选了就清不掉,所以必须有一项代表"不分组";一个分组都还没有时整个下拉框都不出现 */}
      {existingGroups.length > 0 && (
        <Form.Dropdown
          id="existingGroup"
          title={t("grp.existingTitle")}
          value={selectedGroup}
          onChange={setSelectedGroup}
          placeholder={t("common.searchPlaceholder")}
        >
          <Form.Dropdown.Item value="" title={t("grp.none")} />
          {existingGroups.map((g) => (
            <Form.Dropdown.Item key={g} value={g} title={g} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        id="newGroup"
        title={t("grp.newTitle")}
        placeholder={t("grp.newPlaceholder")}
        value={newGroup}
        onChange={setNewGroup}
      />
    </>
  );

  return { group, fields };
}
