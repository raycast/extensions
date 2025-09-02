import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { API_HEADERS, API_URL, useTallyPaginated } from "./tally";
import { Form as tlyForm, FormStatus, SubmissionResult, DetailedForm } from "./interfaces";
import OpenInTally from "./open-in-tally";
import { FormValidation, useFetch, useForm } from "@raycast/utils";

export default function Forms() {
  const { isLoading, data: forms, revalidate } = useTallyPaginated<tlyForm>("forms");
  return (
    <List isLoading={isLoading}>
      {forms.map((form) => (
        <List.Item
          key={form.id}
          icon={Icon.List}
          title={form.name || "Untitled"}
          accessories={[{ tag: form.status }, { date: new Date(form.updatedAt), tooltip: `Edited ${form.updatedAt}` }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Text} title="Submissions" target={<Submissions form={form} />} />
              <Action.Push
                icon={Icon.Pencil}
                title="Update Form"
                target={<UpdateForm formId={form.id} />}
                onPop={revalidate}
              />
              <OpenInTally route={`forms/${form.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateForm({ formId }: { formId: string }) {
  const { pop } = useNavigation();
  const { isLoading, data: form } = useFetch<DetailedForm>(API_URL + `forms/${formId}`, {
    headers: API_HEADERS,
    keepPreviousData: false,
  });

  interface FormValues {
    name: string;
    status: string;

    hasProgressBar: boolean;
    hasSelfEmailNotifications: boolean;
    password: string;
    isClosed: boolean;
    submissionsLimit: string;
    pageAutoJump: boolean;
    saveForLater: boolean;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating", formId);
      try {
        const { name, status, ...settings } = values;
        const response = await fetch(API_URL + `forms/${formId}`, {
          method: "PATCH",
          headers: API_HEADERS,
          body: JSON.stringify({
            name,
            status,
            settings,
          }),
        });
        if (!response.ok) {
          const err = (await response.json()) as { message: string };
          throw new Error(err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Updated";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not update";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      name: form?.name || undefined,
      status: form?.status,
      ...form?.settings,
      password: form?.settings.password || undefined,
      submissionsLimit: form?.settings.submissionsLimit?.toString(),
    },
    validation: {
      name: FormValidation.Required,
      submissionsLimit(value) {
        if (value) {
          if (!Number(value)) return "Should be a Number";
          if (Number(value) < 1) return "Should be minimum 1";
        }
      },
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Form title" {...itemProps.name} />
      <Form.Dropdown title="Status" {...itemProps.status}>
        {Object.keys(FormStatus).map((status) => (
          <Form.Dropdown.Item key={status} title={status} value={status} />
        ))}
      </Form.Dropdown>
      <Form.Separator />

      <Form.Description text="General" />
      <Form.Checkbox
        label="Progress bar"
        info="The progress bar provides a clear way for respondents to understand how much of the form they have completed, and encourages them to continue until the end."
        {...itemProps.hasProgressBar}
      />
      <Form.Separator />

      <Form.Description text="Email Notifications" />
      <Form.Checkbox
        label="Self email notifications"
        info="Get an email for new form submissions."
        {...itemProps.hasSelfEmailNotifications}
      />
      <Form.Separator />

      <Form.Description text="Access" />
      <Form.PasswordField
        title="Password protect form"
        placeholder="Password"
        info="Enable this setting to require a password before respondents can access the form."
        {...itemProps.password}
      />
      <Form.Checkbox
        label="Close form"
        info="People won't be able to respond to this form anymore."
        {...itemProps.isClosed}
      />
      <Form.TextField
        title="Limit submissions"
        placeholder="Max submissions"
        info="Set how many submissions you want to receive in total."
        {...itemProps.submissionsLimit}
      />
      <Form.Separator />

      <Form.Description text="Behavior" />
      <Form.Checkbox
        label="Auto-jump to next page"
        info="Automatically jump to the next page when a question gets answered. Only works with one multiple choice, dropdown, rating or linear scale question per page."
        {...itemProps.pageAutoJump}
      />
      <Form.Checkbox
        label="Save answers for later"
        info="Save answers of not-submitted forms, so respondents can continue from where they left off. The answers are stored in the local browser storage and never leave the respondent's computer."
        {...itemProps.saveForLater}
      />
    </Form>
  );
}

function Submissions({ form }: { form: tlyForm }) {
  const { isLoading, data } = useFetch(API_URL + `forms/${form.id}/submissions`, {
    headers: API_HEADERS,
    mapResult(result: SubmissionResult) {
      return {
        data: {
          questions: result.questions,
          submissions: result.submissions,
        },
        hasMore: result.hasMore,
      };
    },
    initialData: {
      questions: [],
      submissions: [],
    },
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {data.submissions.map((d) => (
        <List.Item
          key={d.id}
          title={d.id}
          detail={
            <List.Item.Detail
              markdown={`
| question | answer |
|----------|--------|
${Object.values(d.responses)
  .map(
    (response) =>
      `| ${data.questions.find((question) => question.id === response.questionId)?.title} | ${JSON.stringify(response.answer)} |`,
  )
  .join(`\n`)}`}
            />
          }
          actions={
            <ActionPanel>
              <OpenInTally route={`forms/${form.id}/submissions`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
