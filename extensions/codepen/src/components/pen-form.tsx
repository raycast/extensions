import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { getClient } from "../lib/api";
import { useMutation } from "../lib/hooks";
import { starterFiles } from "../lib/starter-files";
import { accessSchema, buildMessage, type Pen, type PenDetails } from "../lib/models";
import { PenDetail } from "./pen-detail";

type Props = { mode: "create"; onSaved?: () => void } | { mode: "edit" | "fork"; pen: Pen; onSaved: () => void };
type Values = {
  title: string;
  description: string;
  tags: string;
  access: string;
  password: string;
  template: boolean;
  customCode: boolean;
  html: string;
  css: string;
  js: string;
};

export function PenForm(props: Props) {
  const pen = props.mode === "create" ? undefined : props.pen;
  const { pop, push } = useNavigation();
  const mutation = useMutation();
  const { handleSubmit, itemProps, values, reset } = useForm<Values>({
    initialValues: {
      title: props.mode === "fork" ? `${pen?.title} (Fork)` : (pen?.title ?? ""),
      description: pen?.description ?? "",
      tags: pen?.tags.join(", ") ?? "",
      access: pen?.access ?? "default",
      password: "",
      template: pen?.template ?? false,
      customCode: false,
      html: "<h1>Hello, CodePen!</h1>",
      css: "body { font-family: system-ui; }",
      js: "",
    },
    validation: {
      title: FormValidation.Required,
      password: (value) => {
        if (values.access !== "Protected") return;
        const needsPassword = values.access === "Protected" && (props.mode !== "edit" || pen?.access !== "Protected");
        if ((needsPassword || value) && (value?.length ?? 0) < 8) return "Use at least 8 characters";
      },
    },
    onSubmit: async (input) => {
      const tags = input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const access = input.access === "default" ? undefined : accessSchema.parse(input.access);
      const password = input.access === "Protected" && input.password ? input.password : undefined;
      if (props.mode === "edit") {
        const current = props.pen;
        const details: Partial<PenDetails> = {};
        if (input.title !== current.title) details.title = input.title;
        if (input.description !== current.description) details.description = input.description;
        if (!sameSequence(tags, current.tags)) details.tags = tags;
        if (access && access !== current.access) details.access = access;
        if (password) details.password = password;
        if (input.template !== current.template) details.template = input.template;
        if (Object.keys(details).length === 0) {
          props.onSaved();
          pop();
          return;
        }
        await mutation.run(
          "Pen updated",
          () => getClient().updatePen(current.id, details),
          () => {
            props.onSaved();
            pop();
          },
        );
        return;
      }
      const details = {
        title: input.title,
        description: input.description,
        tags,
        access,
        password,
        template: input.template,
      };
      const files = input.customCode ? starterFiles(input) : undefined;
      await mutation.run(
        props.mode === "fork" ? "Pen forked" : "Pen created",
        () =>
          props.mode === "fork" ? getClient().forkPen(props.pen.id, details) : getClient().createPen(details, files),
        (created) => {
          void showToast({
            style: Toast.Style.Success,
            title: props.mode === "fork" ? "Pen forked" : "Pen created",
            message: buildMessage(created.build),
          });
          if (props.onSaved) {
            props.onSaved();
            pop();
          } else reset();
          push(<PenDetail penId={created.id} />);
        },
      );
    },
  });
  const title = props.mode === "create" ? "Create Pen" : props.mode === "fork" ? "Fork Pen" : "Edit Pen";
  return (
    <Form
      navigationTitle={title}
      isLoading={mutation.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={title} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="My next idea" {...itemProps.title} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.TextField title="Tags" placeholder="demo, css, animation" {...itemProps.tags} />
      <Form.Dropdown title="Privacy" {...itemProps.access}>
        {!pen && <Form.Dropdown.Item value="default" title="Account Default" />}
        <Form.Dropdown.Item value="Public" title="Public" />
        <Form.Dropdown.Item value="Private" title="Private (PRO)" />
        <Form.Dropdown.Item value="Protected" title="Password Protected (PRO)" />
        <Form.Dropdown.Item value="Collaborators" title="Collaborators Only (PRO)" />
      </Form.Dropdown>
      {values.access === "Protected" && (
        <Form.PasswordField
          title="Password"
          placeholder={
            props.mode === "edit" && pen?.access === "Protected"
              ? "Leave blank to keep current password"
              : "At least 8 characters"
          }
          {...itemProps.password}
        />
      )}
      {props.mode !== "fork" && <Form.Checkbox label="Use as a template" {...itemProps.template} />}
      {props.mode === "create" && (
        <>
          <Form.Separator />
          <Form.Checkbox label="Add HTML, CSS, and JavaScript" {...itemProps.customCode} />
          {values.customCode ? (
            <>
              <Form.TextArea title="HTML Body" {...itemProps.html} />
              <Form.TextArea title="CSS" {...itemProps.css} />
              <Form.TextArea title="JavaScript" {...itemProps.js} />
            </>
          ) : (
            <Form.Description text="Your Pen will start with CodePen’s default starter files." />
          )}
        </>
      )}
    </Form>
  );
}

function sameSequence(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
