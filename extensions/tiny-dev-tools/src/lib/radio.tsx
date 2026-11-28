/**
 * RadioGroup：用 Form.Checkbox 组模拟单选（Raycast Form 无原生 Radio 组件）。
 * 所有选项平铺可见、一眼全览；选中一项自动取消其他，再点自身不取消。
 */
import { Form } from "@raycast/api";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export function RadioGroup<T extends string>(props: {
  /** 组名，显示在第一个选项所在行的左侧标签列 */
  title: string;
  /** 用作每个 Checkbox id 的前缀（Raycast 要求 id 必填） */
  id: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <>
      {props.options.map((o, i) => (
        <Form.Checkbox
          key={o.value}
          id={`${props.id}-${o.value}`}
          title={i === 0 ? props.title : ""}
          label={o.label}
          value={props.value === o.value}
          onChange={(checked) => {
            if (checked) props.onChange(o.value);
          }}
        />
      ))}
    </>
  );
}
