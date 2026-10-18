import { Fragment, useRef, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { withResend } from "./lib/oauth";
import {
  ApplicationInput,
  Position,
  PositionField,
  applicationInfo,
  applyToPosition,
  customFields,
  listPositions,
  positionUrl,
  retrievePosition,
  supportsField,
  validateApplication,
  validateResume,
} from "./lib/positions";

export default withResend(Careers);

function Careers() {
  const { data, error, isLoading, revalidate } = useCachedPromise(listPositions, []);
  const [region, setRegion] = useState("all");
  const positions = data?.data.filter(
    (position) => region === "all" || position.location?.trim().toLowerCase() === region,
  );
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search positions at Resend"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Region" value={region} onChange={setRegion}>
          <List.Dropdown.Item title="All Positions" value="all" />
          <List.Dropdown.Item title="Americas" value="americas" />
          <List.Dropdown.Item title="Europe" value="europe" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could Not Load Positions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} />
              <Action.OpenInBrowser title="View Careers in Browser" url="https://resend.com/careers" />
            </ActionPanel>
          }
        />
      ) : !isLoading && !positions?.length ? (
        <List.EmptyView
          title="No Open Positions"
          description={
            region === "all" ? undefined : `No open positions in ${region === "americas" ? "the Americas" : "Europe"}.`
          }
          actions={
            <ActionPanel>
              <Action title="Reload" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        positions?.map((position) => (
          <List.Item
            key={position.id}
            title={position.title}
            subtitle={position.location ?? undefined}
            keywords={[position.department, position.team, position.location].filter((value): value is string =>
              Boolean(value),
            )}
            accessories={position.department ? [{ tag: position.department }] : []}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Apply to Job"
                  icon={Icon.Document}
                  target={<PositionApplication positionId={position.id} />}
                />
                <Action.OpenInBrowser title="View Job in Browser" url={positionUrl(position.id)} />
                <Action.CopyToClipboard title="Copy Position ID" content={position.id} />
                <Action title="Reload Positions" icon={Icon.Redo} onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function PositionApplication({ positionId }: { positionId: string }) {
  // Application answers and files remain in component state; only the public job definition is cached.
  const { data: position, error, isLoading, revalidate } = useCachedPromise(retrievePosition, [positionId]);
  if (error)
    return (
      <Detail
        markdown={`Could not load the application.\n\n${escapeMarkdown(error.message)}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} />
            <Action.OpenInBrowser title="Apply in Browser" url={positionUrl(positionId)} />
          </ActionPanel>
        }
      />
    );
  if (!position) return <Detail isLoading={isLoading} />;
  return <ApplicationForm position={position} />;
}

function ApplicationForm({ position }: { position: Position }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resume, setResume] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const reviewing = useRef(false);
  const { push } = useNavigation();
  const fields = customFields(position);
  const blocked = fields.some((field) => field.required && !supportsField(field));

  async function review() {
    if (reviewing.current) return;
    reviewing.current = true;
    setIsLoading(true);
    try {
      if (resume.length !== 1) throw new Error("Choose exactly one local resume file");
      const input: ApplicationInput = {
        positionId: position.id,
        name,
        email,
        resumePath: resume[0],
        answers: fields
          .filter((field) => answers[field.path]?.trim())
          .map((field) => ({ path: field.path, value: answers[field.path] })),
      };
      validateApplication(position, input);
      await validateResume(input.resumePath);
      push(<ApplicationReview position={position} input={input} />);
    } catch (error) {
      await showFailureToast(error, { title: "Check Application" });
    } finally {
      reviewing.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle={`Apply to ${position.title}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {!blocked && <Action.SubmitForm title="Review Application" icon={Icon.Document} onSubmit={review} />}
          <Action.OpenInBrowser title="Apply in Browser" url={positionUrl(position.id)} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Position"
        text={[position.title, position.location, position.compensation].filter(Boolean).join(" · ")}
      />
      {blocked && (
        <Form.Description text="This position has required questions that cannot be completed here. Choose Apply in Browser to complete the application." />
      )}
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder="Your full name" />
      <Form.TextField id="email" title="Email" value={email} onChange={setEmail} placeholder="Your email address" />
      <Form.FilePicker
        id="resume"
        title="Resume"
        value={resume}
        onChange={setResume}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Required. PDF, DOC, DOCX, or TXT only. Maximum 10 MB; PDF recommended."
      />
      <Form.Separator />
      {fields.map((field, index) => (
        <Fragment key={field.path}>
          <Form.Description
            title={`Question ${index + 1}`}
            text={[field.title, field.description].filter(Boolean).join("\n\n")}
          />
          <ApplicationField
            field={field}
            singleLine={index >= 5 && index <= 7}
            value={answers[field.path] ?? ""}
            onChange={(value) => setAnswers((previous) => ({ ...previous, [field.path]: value }))}
          />
        </Fragment>
      ))}
    </Form>
  );
}

function ApplicationField({
  field,
  singleLine,
  value,
  onChange,
}: {
  field: PositionField;
  singleLine: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const title = `Answer${field.required ? " *" : " (optional)"}`;
  if (!supportsField(field))
    return (
      <Form.Description
        title={title}
        text="Complete this question using Apply in Browser. It cannot be submitted here."
      />
    );
  const options = field.selectable_values?.length
    ? field.selectable_values
    : field.type === "Boolean"
      ? [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ]
      : undefined;
  if (options)
    return (
      <Form.Dropdown id={field.path} title={title} value={value} onChange={onChange} info={field.description}>
        <Form.Dropdown.Item title="Choose an Answer" value="" />
        {options.map((option) => (
          <Form.Dropdown.Item key={option.value} title={option.label} value={option.value} />
        ))}
      </Form.Dropdown>
    );
  const props = { id: field.path, title, value, onChange, info: field.description };
  if (!singleLine && ["Text", "LongText", "String"].includes(field.type)) return <Form.TextArea {...props} />;
  return (
    <Form.TextField
      {...props}
      placeholder={field.type === "Location" ? "Country name, for example Canada" : undefined}
    />
  );
}

function escapeMarkdown(value: string) {
  return value.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&");
}

function ApplicationReview({ position, input }: { position: Position; input: ApplicationInput }) {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitting = useRef(false);
  const markdown = applicationInfo(position, input)
    .map((item) => `### ${escapeMarkdown(item.name)}\n\n${escapeMarkdown(item.value)}`)
    .join("\n\n");

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setIsLoading(true);
    try {
      await applyToPosition(input);
      setSubmitted(true);
      await showToast(Toast.Style.Success, "Application Submitted", position.title);
    } catch (error) {
      submitting.current = false;
      await showFailureToast(error, { title: "Could Not Confirm Submission" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      navigationTitle={submitted ? "Application Submitted" : "Review Application"}
      isLoading={isLoading}
      markdown={
        submitted
          ? `# Application submitted\n\nYour application for ${escapeMarkdown(position.title)} was submitted to Resend.`
          : `# Review your application\n\nSubmitting sends these answers and the selected resume to Resend. Go back to edit.\n\n${markdown}`
      }
      actions={
        <ActionPanel>
          {!submitted && <Action title="Submit Application" icon={Icon.Check} onAction={submit} />}
          <Action.OpenInBrowser title="View Job in Browser" url={positionUrl(position.id)} />
        </ActionPanel>
      }
    />
  );
}
