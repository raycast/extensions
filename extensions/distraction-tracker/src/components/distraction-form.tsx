import { FormValidation, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form } from "@raycast/api";
import { feelings } from "../lib/feelings";
import { DistractionFormValues } from "../lib/types";

export function DistractionForm({
  onSubmitHandler,
  initialValues,
}: {
  onSubmitHandler: (values: DistractionFormValues) => void | boolean | Promise<void | boolean>;
  initialValues?: DistractionFormValues;
}) {
  const { handleSubmit, itemProps } = useForm<DistractionFormValues>({
    async onSubmit(values) {
      onSubmitHandler(values);
    },
    initialValues: {
      time: new Date(),
      ...initialValues,
    },
    validation: {
      time: FormValidation.Required,
      title: FormValidation.Required,
      feeling: FormValidation.Required,
      internalTrigger: FormValidation.Required,
      externalTrigger: FormValidation.Required,
      planningProblem: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Write down what triggered the distraction." />
      <Form.DatePicker title="Time" {...itemProps.time} />
      <Form.TextField title="Distraction" placeholder="What distracted you?" {...itemProps.title} />

      <Form.Dropdown title="How Did You Feel?" placeholder="Select Feeling" {...itemProps.feeling}>
        <Form.Dropdown.Item value={feelings.afraid.id} title={feelings.afraid.title} icon={feelings.afraid.icon} />
        <Form.Dropdown.Item value={feelings.worried.id} title={feelings.worried.title} icon={feelings.worried.icon} />
        <Form.Dropdown.Item
          value={feelings.overwhelmed.id}
          title={feelings.overwhelmed.title}
          icon={feelings.overwhelmed.icon}
        />
        <Form.Dropdown.Item value={feelings.lonely.id} title={feelings.lonely.title} icon={feelings.lonely.icon} />
        <Form.Dropdown.Item value={feelings.jealous.id} title={feelings.jealous.title} icon={feelings.jealous.icon} />
        <Form.Dropdown.Item
          value={feelings.frustrated.id}
          title={feelings.frustrated.title}
          icon={feelings.frustrated.icon}
        />
        <Form.Dropdown.Item value={feelings.angry.id} title={feelings.angry.title} icon={feelings.angry.icon} />
        <Form.Dropdown.Item value={feelings.hungry.id} title={feelings.hungry.title} icon={feelings.hungry.icon} />
        <Form.Dropdown.Item
          value={feelings.embarrassed.id}
          title={feelings.embarrassed.title}
          icon={feelings.embarrassed.icon}
        />
        <Form.Dropdown.Item value={feelings.tired.id} title={feelings.tired.title} icon={feelings.tired.icon} />
        <Form.Dropdown.Item value={feelings.bored.id} title={feelings.bored.title} icon={feelings.bored.icon} />
        <Form.Dropdown.Item value={feelings.nervous.id} title={feelings.nervous.title} icon={feelings.nervous.icon} />
        <Form.Dropdown.Item value={feelings.sad.id} title={feelings.sad.title} icon={feelings.sad.icon} />
        <Form.Dropdown.Item value={feelings.guilty.id} title={feelings.guilty.title} icon={feelings.guilty.icon} />
        <Form.Dropdown.Item
          value={feelings.confused.id}
          title={feelings.confused.title}
          icon={feelings.confused.icon}
        />
        <Form.Dropdown.Item value={feelings.excited.id} title={feelings.excited.title} icon={feelings.excited.icon} />
        <Form.Dropdown.Item
          value={feelings.insecure.id}
          title={feelings.insecure.title}
          icon={feelings.insecure.icon}
        />
        <Form.Dropdown.Item value={feelings.anxious.id} title={feelings.anxious.title} icon={feelings.anxious.icon} />
        <Form.Dropdown.Item
          value={feelings.pressured.id}
          title={feelings.pressured.title}
          icon={feelings.pressured.icon}
        />
        <Form.Dropdown.Item
          value={feelings.resentful.id}
          title={feelings.resentful.title}
          icon={feelings.resentful.icon}
        />
      </Form.Dropdown>

      <Form.Checkbox title="Internal Trigger" label="Internal Trigger" storeValue {...itemProps.internalTrigger} />
      <Form.Checkbox title="External Trigger" label="External Trigger" storeValue {...itemProps.externalTrigger} />
      <Form.Checkbox title="Planning Problem" label="Planning Problem" storeValue {...itemProps.planningProblem} />
      <Form.TextArea title="Ideas" placeholder="What could you do differently?" {...itemProps.ideas} />
    </Form>
  );
}
