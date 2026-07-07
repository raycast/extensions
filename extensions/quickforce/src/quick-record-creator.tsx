import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import {
  listOrgs,
  createRecord,
  addToRecentCreatedRecords,
  getRecentCreatedRecords,
  getPicklistValues,
  CreatedRecord,
} from "./lib/sfdx";
import { OrgListDropdown, useDefaultOrgSelection, useOrgOptions } from "./org-dropdown";

interface RecordTypeConfig {
  objectType: string;
  label: string;
  icon: Icon;
  fields: FieldConfig[];
}

interface FieldConfig {
  apiName: string;
  label: string;
  type: "text" | "email" | "phone" | "picklist" | "textarea" | "number" | "date";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

const RECORD_TYPES: RecordTypeConfig[] = [
  {
    objectType: "Lead",
    label: "Lead",
    icon: Icon.PersonCircle,
    fields: [
      { apiName: "LastName", label: "Last Name", type: "text", required: true, placeholder: "Smith" },
      { apiName: "FirstName", label: "First Name", type: "text", required: false, placeholder: "John" },
      { apiName: "Company", label: "Company", type: "text", required: true, placeholder: "Acme Corp" },
      { apiName: "Email", label: "Email", type: "email", required: false, placeholder: "john.smith@acme.com" },
      { apiName: "Phone", label: "Phone", type: "phone", required: false, placeholder: "+1 555-0100" },
      { apiName: "Title", label: "Title", type: "text", required: false, placeholder: "VP of Sales" },
      {
        apiName: "Status",
        label: "Status",
        type: "picklist",
        required: false,
        options: ["Open - Not Contacted", "Working - Contacted", "Closed - Converted", "Closed - Not Converted"],
      },
    ],
  },
  {
    objectType: "Contact",
    label: "Contact",
    icon: Icon.Person,
    fields: [
      { apiName: "LastName", label: "Last Name", type: "text", required: true, placeholder: "Smith" },
      { apiName: "FirstName", label: "First Name", type: "text", required: false, placeholder: "Jane" },
      { apiName: "Email", label: "Email", type: "email", required: false, placeholder: "jane.smith@example.com" },
      { apiName: "Phone", label: "Phone", type: "phone", required: false, placeholder: "+1 555-0101" },
      { apiName: "Title", label: "Title", type: "text", required: false, placeholder: "Director of Marketing" },
      { apiName: "Department", label: "Department", type: "text", required: false, placeholder: "Marketing" },
    ],
  },
  {
    objectType: "Account",
    label: "Account",
    icon: Icon.Building,
    fields: [
      { apiName: "Name", label: "Account Name", type: "text", required: true, placeholder: "Acme Corporation" },
      { apiName: "Phone", label: "Phone", type: "phone", required: false, placeholder: "+1 555-0102" },
      { apiName: "Website", label: "Website", type: "text", required: false, placeholder: "www.acme.com" },
      {
        apiName: "Type",
        label: "Type",
        type: "picklist",
        required: false,
        options: ["Prospect", "Customer - Direct", "Customer - Channel", "Partner", "Other"],
      },
      { apiName: "Industry", label: "Industry", type: "text", required: false, placeholder: "Technology" },
    ],
  },
  {
    objectType: "Opportunity",
    label: "Opportunity",
    icon: Icon.Star,
    fields: [
      {
        apiName: "Name",
        label: "Opportunity Name",
        type: "text",
        required: true,
        placeholder: "Q1 Enterprise Deal",
      },
      { apiName: "Amount", label: "Amount", type: "number", required: false, placeholder: "50000" },
      { apiName: "CloseDate", label: "Close Date", type: "date", required: true },
      {
        apiName: "StageName",
        label: "Stage",
        type: "picklist",
        required: true,
        options: [
          "Prospecting",
          "Qualification",
          "Needs Analysis",
          "Value Proposition",
          "Negotiation/Review",
          "Closed Won",
          "Closed Lost",
        ],
      },
    ],
  },
  {
    objectType: "Case",
    label: "Case",
    icon: Icon.QuestionMarkCircle,
    fields: [
      {
        apiName: "Subject",
        label: "Subject",
        type: "text",
        required: true,
        placeholder: "Customer inquiry about pricing",
      },
      {
        apiName: "Description",
        label: "Description",
        type: "textarea",
        required: false,
        placeholder: "Detailed description...",
      },
      {
        apiName: "Status",
        label: "Status",
        type: "picklist",
        required: false,
        options: ["New", "Working", "Escalated", "Closed"],
      },
      {
        apiName: "Priority",
        label: "Priority",
        type: "picklist",
        required: false,
        options: ["High", "Medium", "Low"],
      },
      {
        apiName: "Origin",
        label: "Origin",
        type: "picklist",
        required: false,
        options: ["Email", "Phone", "Web", "Chat"],
      },
    ],
  },
  {
    objectType: "Task",
    label: "Task",
    icon: Icon.Checkmark,
    fields: [
      { apiName: "Subject", label: "Subject", type: "text", required: true, placeholder: "Follow up with customer" },
      {
        apiName: "Description",
        label: "Description",
        type: "textarea",
        required: false,
        placeholder: "Task details...",
      },
      { apiName: "ActivityDate", label: "Due Date", type: "date", required: false },
      {
        apiName: "Priority",
        label: "Priority",
        type: "picklist",
        required: false,
        options: ["High", "Normal", "Low"],
      },
      {
        apiName: "Status",
        label: "Status",
        type: "picklist",
        required: false,
        options: ["Not Started", "In Progress", "Completed", "Waiting on someone else", "Deferred"],
      },
    ],
  },
];

function RecordCreationForm({
  recordType,
  initialOrg,
  onCreated,
}: {
  recordType: RecordTypeConfig;
  initialOrg?: string;
  onCreated: () => void;
}) {
  const { pop } = useNavigation();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const { selectedOrg, setSelectedOrg } = useDefaultOrgSelection(initialOrg);
  const orgOptions = useOrgOptions();

  const picklistFieldNames = recordType.fields.filter((f) => f.type === "picklist").map((f) => f.apiName);

  const { data: livePicklists } = useCachedPromise(
    async (org: string, objectType: string) => await getPicklistValues(objectType, picklistFieldNames, org),
    [selectedOrg, recordType.objectType],
    { execute: selectedOrg !== "", keepPreviousData: true },
  );

  const handleFieldChange = (apiName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [apiName]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedOrg) {
      await showToast({ style: Toast.Style.Failure, title: "Please select an org" });
      return;
    }

    // Validate required fields
    const missingFields = recordType.fields
      .filter((f) => f.required && !fieldValues[f.apiName]?.trim())
      .map((f) => f.label);

    if (missingFields.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required fields",
        message: missingFields.join(", "),
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: `Creating ${recordType.label}...` });

    try {
      const populatedFields = Object.fromEntries(
        Object.entries(fieldValues).filter(([, value]) => value.trim() !== ""),
      );
      const recordId = await createRecord(recordType.objectType, populatedFields, selectedOrg);

      const displayName =
        populatedFields["Name"] || populatedFields["Subject"] || populatedFields["LastName"] || "New Record";
      await addToRecentCreatedRecords(recordId, recordType.objectType, displayName, selectedOrg);

      await showToast({
        style: Toast.Style.Success,
        title: `${recordType.label} created!`,
        message: `Record ID: ${recordId}`,
      });

      onCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create record",
        message: String(error),
      });
    }
  };

  const renderField = (field: FieldConfig) => {
    const commonProps = {
      id: field.apiName,
      title: field.label + (field.required ? " *" : ""),
      value: fieldValues[field.apiName] || "",
      onChange: (value: string) => handleFieldChange(field.apiName, value),
    };

    switch (field.type) {
      case "textarea":
        return <Form.TextArea {...commonProps} placeholder={field.placeholder} />;
      case "picklist": {
        const options = livePicklists?.[field.apiName]?.length ? livePicklists[field.apiName] : field.options;
        return (
          <Form.Dropdown {...commonProps}>
            <Form.Dropdown.Item value="" title="--None--" />
            {options?.map((opt) => (
              <Form.Dropdown.Item key={opt} value={opt} title={opt} />
            ))}
          </Form.Dropdown>
        );
      }
      case "date":
        return (
          <Form.DatePicker
            id={field.apiName}
            title={field.label + (field.required ? " *" : "")}
            value={fieldValues[field.apiName] ? new Date(fieldValues[field.apiName]) : null}
            onChange={(date: Date | null) =>
              handleFieldChange(field.apiName, date ? date.toISOString().split("T")[0] : "")
            }
          />
        );
      default:
        return <Form.TextField {...commonProps} placeholder={field.placeholder} />;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Create ${recordType.label}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle={`Create ${recordType.label}`}
    >
      <Form.Dropdown
        id="org"
        title="Org"
        storeValue
        value={selectedOrg}
        onChange={setSelectedOrg}
        info="Select the org where the record will be created"
      >
        <Form.Dropdown.Item value="" title="Select an org..." icon={Icon.Cloud} />
        {orgOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {recordType.fields.map((field) => renderField(field))}

      <Form.Description text="* Required fields" />
    </Form>
  );
}

function RecentRecordsView() {
  const [recentRecords, setRecentRecords] = useState<CreatedRecord[]>([]);

  const { data: orgs } = useCachedPromise(listOrgs, [], {
    keepPreviousData: true,
  });

  useEffect(() => {
    loadRecent();
  }, []);

  async function loadRecent() {
    const records = await getRecentCreatedRecords();
    setRecentRecords(records);
  }

  const getRecordUrl = (record: CreatedRecord) => {
    const org = orgs?.find((o) => (o.alias || o.username) === record.org);
    return org ? `${org.instanceUrl}/lightning/r/${record.objectType}/${record.id}/view` : null;
  };

  const getIconForType = (objectType: string): Icon => {
    const type = RECORD_TYPES.find((t) => t.objectType === objectType);
    return type?.icon || Icon.Document;
  };

  return (
    <List searchBarPlaceholder="Search recent records...">
      {recentRecords.map((record) => {
        const url = getRecordUrl(record);
        const createdDate = new Date(record.createdAt).toLocaleString();

        return (
          <List.Item
            key={record.id}
            icon={{ source: getIconForType(record.objectType), tintColor: Color.Green }}
            title={record.name}
            subtitle={`${record.objectType} • ${record.org}`}
            accessories={[{ text: createdDate }]}
            actions={
              <ActionPanel>
                {url && <Action.OpenInBrowser title="Open in Salesforce" url={url} />}
                <Action.CopyToClipboard
                  title="Copy Record Id"
                  content={record.id}
                  shortcut={{ modifiers: ["cmd"], key: "i" }}
                />
                {url && (
                  <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "u" }} />
                )}
              </ActionPanel>
            }
          />
        );
      })}

      {recentRecords.length === 0 && (
        <List.EmptyView
          icon={Icon.Document}
          title="No Recent Records"
          description="Records you create will appear here"
        />
      )}
    </List>
  );
}

export default function Command() {
  const [revalidateKey, setRevalidateKey] = useState(0);

  const { selectedOrg, setSelectedOrg } = useDefaultOrgSelection();
  const orgOptions = useOrgOptions();
  const selectedOrgTitle = orgOptions.find((option) => option.value === selectedOrg)?.title;

  const handleRecordCreated = () => {
    setRevalidateKey((prev) => prev + 1);
  };

  return (
    <List
      searchBarPlaceholder="Choose a record type to create..."
      searchBarAccessory={<OrgListDropdown value={selectedOrg} onChange={setSelectedOrg} />}
    >
      <List.Section title="Create New Record">
        {RECORD_TYPES.map((recordType) => (
          <List.Item
            key={recordType.objectType}
            icon={{ source: recordType.icon, tintColor: Color.Blue }}
            title={recordType.label}
            subtitle={`Create a new ${recordType.label}`}
            accessories={[
              selectedOrgTitle ? { text: selectedOrgTitle } : { tag: { value: "Select Org", color: Color.Orange } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title={`Create ${recordType.label}`}
                  icon={Icon.Plus}
                  target={
                    <RecordCreationForm
                      recordType={recordType}
                      initialOrg={selectedOrg}
                      onCreated={handleRecordCreated}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Recent">
        <List.Item
          icon={Icon.Clock}
          title="View Recent Records"
          subtitle="See recently created records"
          actions={
            <ActionPanel>
              <Action.Push
                title="View Recent Records"
                icon={Icon.List}
                target={<RecentRecordsView key={revalidateKey} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
