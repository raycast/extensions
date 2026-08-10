import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import axios, { AxiosError } from "axios";
import { BASE_URL, baseHeaders } from "../lib/constants";
import { ErrorResponse } from "../lib/types";
import { UsersResponse } from "../lib/types/users-types.types";
import { ReactNode, useState } from "react";
import Projects from "../manage-projects";
import useAuth from "../hooks/useAuth";

const OTP_ERROR_CODE = "ONE_TIME_PASSWORD_REQUIRED";

interface Payload {
  email: string;
  password: string;
  otp: string;
}

interface SuccessLogin {
  data: {
    sessionSecret: string;
  };
}

type LoginResponse = SuccessLogin | ErrorResponse;

export default function LoginForm({ destination }: { destination?: ReactNode }) {
  const [formState, setFormState] = useState<"static" | "loading">("static");

  const [requiresOTP, setRequiresOTP] = useState(false);

  const { getAuthHeaders } = useAuth();

  const { push } = useNavigation();

  async function getAccount() {
    const toast = await showToast({ title: "Setting up...", style: Toast.Style.Animated });

    const data = JSON.stringify([
      {
        operationName: "CurrentUser",
        variables: {},
        query:
          "query CurrentUser {\n  __typename\n  meUserActor {\n    ...CurrentUserData\n    __typename\n  }\n  experimentation {\n    userConfig\n    deviceConfig\n    deviceExperimentationUnit\n    __typename\n  }\n}\n\nfragment CurrentUserData on UserActor {\n  __typename\n  id\n  username\n  profilePhoto\n  firstName\n  lastName\n  isExpoAdmin\n  primaryAccount {\n    id\n    name\n    __typename\n  }\n  accounts {\n    ...AccountsData\n    __typename\n  }\n  bestContactEmail\n  featureGates\n  ... on User {\n    email\n    emailVerified\n    pendingUserInvitations {\n      ...UserInvitationData\n      __typename\n    }\n    __typename\n  }\n  githubUser {\n    id\n    githubUserIdentifier\n    __typename\n  }\n  preferences {\n    selectedAccountName\n    __typename\n  }\n}\n\nfragment AccountsData on Account {\n  __typename\n  id\n  name\n  isDisabled\n  createdAt\n  ownerUserActor {\n    __typename\n    id\n    fullName\n    profilePhoto\n    username\n    ... on User {\n      email\n      __typename\n    }\n  }\n  viewerUserPermission {\n    ...UserPermissionData\n    __typename\n  }\n  subscription {\n    name\n    id\n    planId\n    status\n    nextInvoice\n    __typename\n  }\n}\n\nfragment UserPermissionData on UserPermission {\n  permissions\n  role\n  userActor {\n    id\n    created\n    firstName\n    lastName\n    profilePhoto\n    displayName\n    username\n    bestContactEmail\n    ... on User {\n      email\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment UserInvitationData on UserInvitation {\n  id\n  email\n  created\n  expires\n  accountName\n  accountProfilePhoto\n  permissions\n  role\n  isForOrganization\n  __typename\n}",
      },
    ]);

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: BASE_URL,
      headers: await getAuthHeaders(),
      data: data,
    };

    try {
      setFormState("loading");
      const resp = await axios.request<UsersResponse>(config);
      setFormState("static");
      if ("errors" in resp.data) {
        const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
        showToast({ title: "Login Failed", message: errorMessages, style: Toast.Style.Failure });
      } else {
        const accounts = resp.data[0].data.meUserActor.accounts;

        LocalStorage.setItem("accounts", JSON.stringify(accounts));

        toast.style = Toast.Style.Success;
        toast.title = "All setup";
        toast.message = "You can use the other commands";
        push(destination ?? <Projects />);
      }
    } catch (error) {
      showToast({ title: "Error setting up", message: (error as Error)?.message || "", style: Toast.Style.Failure });
    }
    setFormState("static");
  }

  const { handleSubmit } = useForm<Payload>({
    onSubmit: async (values) => {
      setFormState("loading");
      try {
        const resp = await axios.post<LoginResponse>(
          "https://api.expo.dev/v2/auth/loginAsync",
          requiresOTP
            ? {
                username: values.email,
                password: values.password,
                otp: values.otp,
              }
            : {
                username: values.email,
                password: values.password,
              },
          {
            headers: baseHeaders,
          },
        );
        // check if succesful response or failed
        if ("data" in resp.data) {
          showToast({ title: "Logged In", message: "", style: Toast.Style.Success });
          getAccount();
          LocalStorage.setItem("sessionSecret", resp.data.data.sessionSecret);
        } else {
          const errorMessages = (resp.data as ErrorResponse).errors.map((error) => error.message).join(", ");
          showToast({ title: "Login Failed", message: errorMessages, style: Toast.Style.Failure });
        }
      } catch (error) {
        const errorResponse = (error as AxiosError).response;
        if (errorResponse && errorResponse.data && (errorResponse.data as ErrorResponse).errors) {
          const errorData = errorResponse.data as ErrorResponse;
          const errorCodes = errorData.errors.map((err) => err.code);

          if (errorCodes.includes(OTP_ERROR_CODE)) {
            setRequiresOTP(true);
            setFormState("static");
            return;
          }
        }
        showToast({ title: "Error logging in", style: Toast.Style.Failure });
      }
    },
    validation: requiresOTP
      ? {
          email: FormValidation.Required,
          password: FormValidation.Required,
          otp: FormValidation.Required,
        }
      : {
          email: FormValidation.Required,
          password: FormValidation.Required,
        },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Log into Expo Account"
      isLoading={formState === "loading" ? true : false}
    >
      <Form.TextField id="email" title="Email" placeholder="john@doe.com" defaultValue="" />
      <Form.PasswordField id="password" title="Password" placeholder="******" defaultValue="" />
      {requiresOTP && <Form.TextField id="otp" title="Enter your OTP" placeholder="******" defaultValue="" />}
    </Form>
  );
}
