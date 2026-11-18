import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  ApplicationStage,
  ApplicationStatus,
  CreateApplicationInput,
  ExtractedJobData,
  InterviewFormat,
  createApplication,
  extractJobFromUrl,
  fetchApplicationStages,
} from "./api";

export default function AddApplicationCommand() {
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const { push } = useNavigation();

  async function handleExtract(values: { url: string }) {
    const urlValue = values.url?.trim() ?? "";
    if (!urlValue) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a URL" });
      return;
    }

    setIsExtracting(true);

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Extracting job details...",
        message: "This may take a moment",
      });

      const extracted = await extractJobFromUrl(urlValue);

      showToast({
        style: Toast.Style.Success,
        title: "Job details extracted",
        message: extracted.company
          ? `${extracted.role} at ${extracted.company}`
          : "Review and complete the form",
      });

      push(<ApplicationForm initialData={extracted} />);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to extract job details",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <Form
      isLoading={isExtracting}
      navigationTitle="Add Job Application"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Extract Job Details"
            onSubmit={handleExtract}
            icon={Icon.MagnifyingGlass}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text) setUrl(text);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Job Posting URL"
        placeholder="https://..."
        value={url}
        onChange={setUrl}
        autoFocus
      />
      <Form.Description text="Paste a job posting URL from LinkedIn, Indeed, Greenhouse, Lever, or any job board." />
    </Form>
  );
}

function ApplicationForm({ initialData }: { initialData: ExtractedJobData }) {
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - pre-filled from extracted data
  const [company, setCompany] = useState(initialData.company || "");
  const [role, setRole] = useState(initialData.role || "");
  const [stageId, setStageId] = useState("");
  const [location, setLocation] = useState(initialData.location || "");
  const [jobUrl, setJobUrl] = useState(initialData.jobUrl || "");
  const [appliedAt, setAppliedAt] = useState<Date | null>(new Date());
  const [status, setStatus] = useState<ApplicationStatus>("Cold");
  const [interviewFormat, setInterviewFormat] = useState("");
  const [contactName, setContactName] = useState(initialData.contactName || "");
  const [contactEmail, setContactEmail] = useState(
    initialData.contactEmail || "",
  );
  const [notes, setNotes] = useState("");
  const [jobDescription, setJobDescription] = useState(
    initialData.jobDescription || "",
  );

  // Validation errors
  const [companyError, setCompanyError] = useState<string | undefined>();
  const [roleError, setRoleError] = useState<string | undefined>();
  const [jobUrlError, setJobUrlError] = useState<string | undefined>();
  const [contactEmailError, setContactEmailError] = useState<
    string | undefined
  >();

  useEffect(() => {
    async function loadStages() {
      try {
        const fetchedStages = await fetchApplicationStages();
        setStages(fetchedStages);

        const appliedStage = fetchedStages.find((s) => s.name === "Applied");
        if (appliedStage) {
          setStageId(appliedStage.id);
        } else if (fetchedStages.length > 0) {
          setStageId(fetchedStages[0].id);
        }
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load stages",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadStages();
  }, []);

  function validateUrl(value: string): boolean {
    if (!value || value.trim() === "") return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  function validateEmail(email: string): boolean {
    if (!email || email.trim() === "") return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleCompanyChange(value: string) {
    setCompany(value);
    setCompanyError(
      value.trim().length === 0 ? "Company is required" : undefined,
    );
  }

  function handleRoleChange(value: string) {
    setRole(value);
    setRoleError(value.trim().length === 0 ? "Role is required" : undefined);
  }

  function handleJobUrlChange(value: string) {
    setJobUrl(value);
    setJobUrlError(!validateUrl(value) ? "Invalid URL format" : undefined);
  }

  function handleContactEmailChange(value: string) {
    setContactEmail(value);
    setContactEmailError(
      !validateEmail(value) ? "Invalid email format" : undefined,
    );
  }

  type FormValues = {
    company: string;
    role: string;
    stageId: string;
    location: string;
    jobUrl: string;
    appliedAt: Date | null;
    status: ApplicationStatus;
    interviewFormat: string;
    contactName: string;
    contactEmail: string;
    notes: string;
    jobDescription: string;
  };

  async function handleSubmit(values: FormValues) {
    let hasError = false;

    const companyVal = values.company?.trim() ?? "";
    const roleVal = values.role?.trim() ?? "";
    if (companyVal.length === 0) {
      setCompanyError("Company is required");
      hasError = true;
    } else setCompanyError(undefined);
    if (roleVal.length === 0) {
      setRoleError("Role is required");
      hasError = true;
    } else setRoleError(undefined);
    if (!values.stageId) {
      showToast({ style: Toast.Style.Failure, title: "Stage is required" });
      hasError = true;
    }
    const jobUrlInvalid = !validateUrl(values.jobUrl ?? "");
    if (jobUrlInvalid && (values.jobUrl ?? "").trim() !== "") {
      setJobUrlError("Invalid URL format");
      hasError = true;
    } else setJobUrlError(undefined);
    const emailInvalid = !validateEmail(values.contactEmail ?? "");
    if (emailInvalid && (values.contactEmail ?? "").trim() !== "") {
      setContactEmailError("Invalid email format");
      hasError = true;
    } else setContactEmailError(undefined);

    if (hasError) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please fix the errors before submitting",
      });
      return;
    }

    setIsSubmitting(true);

    const input: CreateApplicationInput = {
      company: companyVal,
      role: roleVal,
      stageId: values.stageId,
      status: values.status,
    };

    const locationVal = (values.location ?? "").trim();
    const jobUrlVal = (values.jobUrl ?? "").trim();
    if (locationVal) input.location = locationVal;
    if (jobUrlVal) input.jobUrl = jobUrlVal;
    if (values.appliedAt) input.appliedAt = values.appliedAt.toISOString();
    if (values.interviewFormat)
      input.interviewFormat = values.interviewFormat as InterviewFormat;
    const contactNameVal = (values.contactName ?? "").trim();
    const contactEmailVal = (values.contactEmail ?? "").trim();
    if (contactNameVal) input.contactName = contactNameVal;
    if (contactEmailVal) input.contactEmail = contactEmailVal;
    const notesVal = (values.notes ?? "").trim();
    const jobDescVal = (values.jobDescription ?? "").trim();
    if (notesVal) input.notes = notesVal;
    if (jobDescVal) input.jobDescription = jobDescVal;

    try {
      const application = await createApplication(input);

      showToast({
        style: Toast.Style.Success,
        title: "Application Created",
        message: `${application.role} at ${application.company}`,
      });

      popToRoot();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create application",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = initialData.company
    ? `${initialData.role || "Role"} at ${initialData.company}`
    : "Confirm Application";

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Application"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="company"
        title="Company"
        placeholder="e.g., Google"
        value={company}
        onChange={handleCompanyChange}
        error={companyError}
      />

      <Form.TextField
        id="role"
        title="Role"
        placeholder="e.g., Software Engineer"
        value={role}
        onChange={handleRoleChange}
        error={roleError}
      />

      <Form.Dropdown
        id="stageId"
        title="Stage"
        value={stageId}
        onChange={setStageId}
      >
        {stages.map((stage) => (
          <Form.Dropdown.Item
            key={stage.id}
            value={stage.id}
            title={stage.name}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="location"
        title="Location"
        placeholder="e.g., San Francisco, CA"
        value={location}
        onChange={setLocation}
      />

      <Form.TextField
        id="jobUrl"
        title="Job URL"
        placeholder="https://..."
        value={jobUrl}
        onChange={handleJobUrlChange}
        error={jobUrlError}
      />

      <Form.DatePicker
        id="appliedAt"
        title="Applied Date"
        value={appliedAt}
        onChange={setAppliedAt}
      />

      <Form.Separator />

      <Form.Dropdown
        id="status"
        title="Status"
        value={status}
        onChange={(value: string) => setStatus(value as ApplicationStatus)}
      >
        <Form.Dropdown.Item value="Cold" title="Cold" />
        <Form.Dropdown.Item value="Warm" title="Warm" />
        <Form.Dropdown.Item value="Closed" title="Closed" />
      </Form.Dropdown>

      <Form.Dropdown
        id="interviewFormat"
        title="Interview Format"
        value={interviewFormat}
        onChange={setInterviewFormat}
      >
        <Form.Dropdown.Item value="" title="Not Set" />
        <Form.Dropdown.Item value="Remote" title="Remote" />
        <Form.Dropdown.Item value="Phone" title="Phone" />
        <Form.Dropdown.Item value="InPerson" title="In Person" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="contactName"
        title="Contact Name"
        placeholder="e.g., John Smith"
        value={contactName}
        onChange={setContactName}
      />

      <Form.TextField
        id="contactEmail"
        title="Contact Email"
        placeholder="e.g., john@company.com"
        value={contactEmail}
        onChange={handleContactEmailChange}
        error={contactEmailError}
      />

      <Form.Separator />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Any additional notes..."
        value={notes}
        onChange={setNotes}
      />

      <Form.TextArea
        id="jobDescription"
        title="Job Description"
        placeholder="Job description..."
        value={jobDescription}
        onChange={setJobDescription}
        enableMarkdown
      />
    </Form>
  );
}
