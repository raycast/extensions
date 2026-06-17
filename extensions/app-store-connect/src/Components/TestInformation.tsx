import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";
import { App } from "../Model/schemas";
import { betaAppReviewDetailsSchema, betaAppLocalizationsSchema, betaLicenseAgreementsSchema } from "../Model/schemas";
import { Form, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useForm } from "@raycast/utils";
import { presentError } from "../Utils/utils";
interface TestInformationProps {
  app: App;
}

interface TestInformationFormValues {
  currentDescription: string;
  currentFeedbackMail: string;
  currentMarketingUrl: string;
  currentPrivacyPolicyUrl: string;
  reviewFirstName: string;
  reviewLastName: string;
  reviewEmail: string;
  reviewPhone: string;
  reviewSignInRequired: boolean;
  reviewDemoAccountUsername: string;
  reviewDemoAccountPassword: string;
  reviewNotes: string;
  currentLicenseAgreement: string;
}
export default function TestInformation({ app }: TestInformationProps) {
  const { data: reviewDetails, isLoading: isLoadingReviewDetails } = useAppStoreConnectApi(
    `/betaAppReviewDetails?filter[app]=${app.id}&limit=40`,
    (response) => {
      return betaAppReviewDetailsSchema.safeParse(response.data).data ?? null;
    },
  );

  const { data: appLocalizations, isLoading: isLoadingAppLocalizations } = useAppStoreConnectApi(
    `/betaAppLocalizations?filter[app]=${app.id}&limit=40`,
    (response) => {
      return betaAppLocalizationsSchema.safeParse(response.data).data ?? null;
    },
  );
  const { data: licenseAgreements, isLoading: isLoadingLicenseAgreements } = useAppStoreConnectApi(
    `/betaLicenseAgreements?filter[app]=${app.id}&limit=40`,
    (response) => {
      return betaLicenseAgreementsSchema.safeParse(response.data).data ?? null;
    },
  );
  const [submitIsLoading, setSubmitIsLoading] = useState(false);

  const { handleSubmit, itemProps, setValue } = useForm<TestInformationFormValues>({
    onSubmit(values) {
      if (!reviewDetails || !appLocalizations || !licenseAgreements) {
        return;
      }
      if (
        (reviewDetails && reviewDetails.length === 0) ||
        (appLocalizations && appLocalizations.length === 0) ||
        (licenseAgreements && licenseAgreements.length === 0)
      ) {
        return;
      }
      setSubmitIsLoading(true);
      (async () => {
        try {
          await fetchAppStoreConnect(`/betaAppReviewDetails/${reviewDetails[0].id}`, "PATCH", {
            data: {
              id: reviewDetails[0].id,
              type: "betaAppReviewDetails",
              attributes: {
                contactEmail: values.reviewEmail,
                contactFirstName: values.reviewFirstName,
                contactLastName: values.reviewLastName,
                contactPhone: values.reviewPhone,
                demoAccountRequired: values.reviewSignInRequired,
                demoAccountUsername: values.reviewDemoAccountUsername,
                demoAccountPassword: values.reviewDemoAccountPassword,
                notes: values.reviewNotes,
              },
            },
          });
          //api.appstoreconnect.apple.com/v1/betaAppLocalizations/7a5bb9f0-2125-4cd5-8ff6-9d1bff6a1cd4
          await fetchAppStoreConnect(`/betaAppLocalizations/${appLocalizations[0].id}`, "PATCH", {
            data: {
              id: appLocalizations[0].id,
              type: "betaAppLocalizations",
              attributes: {
                description: values.currentDescription,
                feedbackEmail: values.currentFeedbackMail,
                marketingUrl: values.currentMarketingUrl,
                privacyPolicyUrl: values.currentPrivacyPolicyUrl,
              },
            },
          });
          await fetchAppStoreConnect(`/betaLicenseAgreements/${licenseAgreements[0].id}`, "PATCH", {
            data: {
              id: licenseAgreements[0].id,
              type: "betaLicenseAgreements",
              attributes: {
                agreementText: values.currentLicenseAgreement,
              },
            },
          });
          setSubmitIsLoading(false);
          showToast({
            style: Toast.Style.Success,
            title: "Success!",
            message: "Updated beta app information",
          });
        } catch (error) {
          presentError(error);
          setSubmitIsLoading(false);
        }
      })();
    },
    validation: {
      reviewDemoAccountUsername: (value) => {
        const reviewSignInRequired = (itemProps.reviewSignInRequired.value as boolean) === true;
        if (reviewSignInRequired && !value) {
          return "Username is required";
        }
      },
      reviewDemoAccountPassword: (value) => {
        const reviewSignInRequired = (itemProps.reviewSignInRequired.value as boolean) === true;
        if (reviewSignInRequired && !value) {
          return "Password is required";
        }
      },
    },
  });

  useEffect(() => {
    if (appLocalizations && appLocalizations.length > 0) {
      // TODO: Handle multiple localizations
      setValue("currentDescription", appLocalizations[0].attributes.description || "");
      setValue("currentFeedbackMail", appLocalizations[0].attributes.feedbackEmail || "");
      setValue("currentMarketingUrl", appLocalizations[0].attributes.marketingUrl || "");
      setValue("currentPrivacyPolicyUrl", appLocalizations[0].attributes.privacyPolicyUrl || "");
    }
  }, [appLocalizations]);

  useEffect(() => {
    if (reviewDetails && reviewDetails.length > 0) {
      setValue("reviewEmail", reviewDetails[0].attributes.contactEmail);
      setValue("reviewFirstName", reviewDetails[0].attributes.contactFirstName);
      setValue("reviewLastName", reviewDetails[0].attributes.contactLastName);
      setValue("reviewPhone", reviewDetails[0].attributes.contactPhone);
      setValue("reviewSignInRequired", reviewDetails[0].attributes.demoAccountRequired);
      setValue("reviewDemoAccountUsername", reviewDetails[0].attributes.demoAccountName || "");
      setValue("reviewDemoAccountPassword", reviewDetails[0].attributes.demoAccountPassword || "");
    }
  }, [reviewDetails]);

  useEffect(() => {
    if (licenseAgreements && licenseAgreements.length > 0) {
      setValue("currentLicenseAgreement", licenseAgreements[0].attributes.agreementText || "");
    }
  }, [licenseAgreements]);

  const reviewSignInRequired = (itemProps.reviewSignInRequired.value as boolean) === true;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoadingReviewDetails || isLoadingAppLocalizations || isLoadingLicenseAgreements || submitIsLoading}
    >
      <Form.Description
        title="Beta App Information"
        text="This information will be shown for the testers of your beta app."
      />
      <Form.TextArea title="Description" placeholder="Beta App Description" {...itemProps.currentDescription} />
      <Form.TextField title="Feedback Email" placeholder="Feedback Email" {...itemProps.currentFeedbackMail} />
      <Form.TextField title="Marketing URL" placeholder="Marketing URL" {...itemProps.currentMarketingUrl} />
      <Form.TextField
        title="Privacy Policy URL"
        placeholder="Privacy Policy URL"
        {...itemProps.currentPrivacyPolicyUrl}
      />
      <Form.Separator />
      <Form.Description
        title="Beta App Review Information"
        text="Contact information and instructions to App Store reviewers."
      />
      <Form.TextField title="First Name" placeholder="First Name" {...itemProps.reviewFirstName} />
      <Form.TextField title="Last Name" placeholder="Last Name" {...itemProps.reviewLastName} />
      <Form.TextField title="Phone" placeholder="Phone" {...itemProps.reviewPhone} />
      <Form.TextField title="Email" placeholder="Email" {...itemProps.reviewEmail} />
      <Form.Checkbox label="Sign In Required" {...itemProps.reviewSignInRequired} />
      {reviewSignInRequired && (
        <>
          <Form.TextField title="Username" {...itemProps.reviewDemoAccountUsername} />
          <Form.PasswordField title="Password" {...itemProps.reviewDemoAccountPassword} />
        </>
      )}
      <Form.TextArea title="Review Notes" placeholder="Notes" {...itemProps.reviewNotes} />
      <Form.Separator />
      <Form.Description
        title="License Agreement"
        text="The license agreement is displayed to users when they attempt to install your beta app."
      />
      <Form.TextArea title="License Agreement" placeholder="License Agreement" {...itemProps.currentLicenseAgreement} />
    </Form>
  );
}
