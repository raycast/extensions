import { Form, ActionPanel, Action, showToast, Toast, Icon, open } from "@raycast/api";
import { useState } from "react";
import { createContact } from "swift:../swift";
import { ErrorResponse, EmailField, PhoneField, FormValues, SuccessResponse } from "./types";
import { AuthorizationView } from "./components/AuthorizationView";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);

  // Email and phone label options
  const emailLabelOptions = [
    { value: "home", title: "Home" },
    { value: "work", title: "Work" },
    { value: "school", title: "School" },
    { value: "other", title: "Other" },
  ];

  const phoneLabelOptions = [
    { value: "mobile", title: "Mobile" },
    { value: "home", title: "Home" },
    { value: "work", title: "Work" },
    { value: "iphone", title: "iPhone" },
    { value: "main", title: "Main" },
    { value: "home fax", title: "Home Fax" },
    { value: "work fax", title: "Work Fax" },
    { value: "pager", title: "Pager" },
    { value: "other", title: "Other" },
  ];

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!values.givenName && !values.familyName) {
        showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Please provide at least a first name or last name",
        });
        return;
      }

      // Prepare emails array
      const emails: EmailField[] = [];
      if (values["emails[0].address"] && values["emails[0].label"] && values["emails[0].label"].length > 0) {
        emails.push({
          address: values["emails[0].address"],
          label: values["emails[0].label"][0],
        });
      }
      if (values["emails[1].address"] && values["emails[1].label"] && values["emails[1].label"].length > 0) {
        emails.push({
          address: values["emails[1].address"],
          label: values["emails[1].label"][0],
        });
      }

      // Prepare phones array
      const phones: PhoneField[] = [];
      if (values["phones[0].number"] && values["phones[0].label"] && values["phones[0].label"].length > 0) {
        phones.push({
          number: values["phones[0].number"],
          label: values["phones[0].label"][0],
        });
      }
      if (values["phones[1].number"] && values["phones[1].label"] && values["phones[1].label"].length > 0) {
        phones.push({
          number: values["phones[1].number"],
          label: values["phones[1].label"][0],
        });
      }

      // Create contact data object
      const contactData = {
        givenName: values.givenName,
        familyName: values.familyName,
        emails: emails,
        phones: phones,
      };

      // Convert to JSON and send to Swift
      const jsonData = JSON.stringify(contactData);
      const responseJson = await createContact(jsonData);
      const response = JSON.parse(responseJson);

      if (response.error) {
        // Handle error response
        const errorResponse = response as ErrorResponse;
        setError(errorResponse);

        if (errorResponse.type !== "authorization") {
          showToast({
            style: Toast.Style.Failure,
            title: "Error Creating Contact",
            message: errorResponse.message,
          });
        }
      } else {
        // Handle success response
        const successResponse = response as SuccessResponse;

        showToast({
          style: Toast.Style.Success,
          title: "Contact Created",
          primaryAction: {
            title: "Open Contact",
            onAction: () => {
              open(`addressbook://${successResponse.id}`);
            },
          },
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If there's an authorization error, show the authorization view
  if (error && error.type === "authorization") {
    return <AuthorizationView error={error} onRetry={() => setError(null)} />;
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Contact" icon={Icon.AddPerson} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="givenName" title="First Name" placeholder="Enter first name" />

      <Form.TextField id="familyName" title="Last Name" placeholder="Enter last name" />

      <Form.Separator />

      <Form.Description text="Email Addresses" />

      <Form.Dropdown id="emails[0].label" title="Email 1 Type" defaultValue="home" info="Type of email address">
        {emailLabelOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={Icon.Envelope} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="emails[0].address" title="Email 1" placeholder="Enter email address" />

      <Form.Dropdown id="emails[1].label" title="Email 2 Type" defaultValue="work" info="Type of email address">
        {emailLabelOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={Icon.Envelope} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="emails[1].address" title="Email 2" placeholder="Enter email address" />

      <Form.Separator />

      <Form.Description text="Phone Numbers" />

      <Form.Dropdown id="phones[0].label" title="Phone 1 Type" defaultValue="mobile" info="Type of phone number">
        {phoneLabelOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={Icon.Phone} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="phones[0].number" title="Phone 1" placeholder="Enter phone number" />

      <Form.Dropdown id="phones[1].label" title="Phone 2 Type" defaultValue="home" info="Type of phone number">
        {phoneLabelOptions.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={Icon.Phone} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="phones[1].number" title="Phone 2" placeholder="Enter phone number" />
    </Form>
  );
}
