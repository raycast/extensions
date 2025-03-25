import { Action, ActionPanel, Form } from "@raycast/api";
import { IntervalFormValues, Item } from "../types";
import { nanoid } from "nanoid";
import { calculateInterval, emptyOrNumber, requiresNumberGreaterThan, secondsToTime, setsToSeconds } from "../utils";
import { FormValidation, useForm } from "@raycast/utils";

export function IntervalForm(props: { item?: Item; onSave: (item: Item) => void }) {
  const { handleSubmit, itemProps, setValue } = useForm<IntervalFormValues>({
    async onSubmit(values) {
      const sets = parseInt(values.sets);
      const warmup = values.warmup ? parseInt(values.warmup) : 0;
      const cooldown = values.cooldown ? parseInt(values.cooldown) : 0;
      const high = parseInt(values.high);
      const low = parseInt(values.low);

      const interval: Item = {
        title: values.title,
        subtitle: values.subtitle,
        interval: {
          warmup: warmup,
          cooldown: cooldown,
          high: high,
          low: low,
          sets: sets,
          intervals: calculateInterval(sets, warmup, cooldown),
          totalTime: setsToSeconds(sets, high, low, warmup, cooldown),
        },
      };

      props.onSave(props?.item ? { ...interval, id: props.item.id } : { ...interval, id: nanoid() });
    },
    validation: {
      title: FormValidation.Required,
      warmup: (value) => {
        return emptyOrNumber(value);
      },
      cooldown: (value) => {
        return emptyOrNumber(value);
      },
      high: (value) => {
        return requiresNumberGreaterThan(value, 0);
      },
      low: (value) => {
        return requiresNumberGreaterThan(value, 0);
      },
      sets: (value) => {
        return requiresNumberGreaterThan(value, 1);
      },
    },
    initialValues: {
      title: props.item?.title,
      subtitle: props.item?.subtitle,
      warmup: props.item?.interval.warmup ? props.item.interval.warmup.toString() : "",
      cooldown: props.item?.interval.cooldown ? props.item.interval.cooldown.toString() : "",
      high: props.item?.interval.high ? props.item.interval.high.toString() : "",
      low: props.item?.interval.low ? props.item.interval.low.toString() : "",
      sets: props.item?.interval.sets ? props.item.interval.sets.toString() : "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="My awesome interval" {...itemProps.title} />
      <Form.TextField title="Subtitle" placeholder="The best ever!" {...itemProps.subtitle} />
      <Form.Description title="Info" text="All intervals are shown in seconds" />
      <Form.TextField title="Warmup" placeholder="0" info="Optional Warmup" {...itemProps.warmup} />
      <Form.TextField title="Cooldown" placeholder="0" info="Optional Cooldown" {...itemProps.cooldown} />
      <Form.TextField title="High" placeholder="30" {...itemProps.high} />
      <Form.TextField title="Low" placeholder="90" {...itemProps.low} />
      <Form.TextField title="Sets" placeholder="6" {...itemProps.sets} />
      <Form.Description
        title="Current Interval"
        text={`${secondsToTime(
          setsToSeconds(
            parseInt(itemProps.sets.value || "2"),
            parseInt(itemProps.high.value || "0"),
            parseInt(itemProps.low.value || "0"),
            parseInt(itemProps.warmup.value || "0"),
            parseInt(itemProps.cooldown.value || "0")
          )
        )}`}
      />
    </Form>
  );
}
