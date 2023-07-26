import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import inFuture from "date-fns/isFuture";
import compareDesc from "date-fns/compareDesc";

type EmployeeResult = {
  count: number;
  results: { uuid: string }[];
};

type AssignmentsResult = {
  count: number;
  results: AssignmentResult[];
};

type AssignmentResult = {
  uuid: string;
  starts_at: string;
  ends_at: string;
  label: string;
  billable: boolean;
  project_id: string;
};

type ProjectResult = {
  uuid: string;
  title: string;
};

type EmployeeAssignent = {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  billable: boolean;
  projectName: string;
  isCurrent?: boolean;
};

const clientId = "Ov7OsFjFBOiAq0KfrPK0UiAKoVK1jwZx48CuxAsG";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Primetric",
  providerIcon: "",
  providerId: "primetric",
  description: "Connect your Primetric account",
});

// Authorization

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://api.primetric.com/auth/authorize/",
    clientId: clientId,
    scope: "read",
  });
  const { authorizationCode } = await client.authorize(authRequest);

  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://api.primetric.com/auth/token/", { method: "POST", body: params });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

// API

export async function fetchEmployeeProjects(name: string): Promise<EmployeeAssignent[]> {
  const response = await fetch(`https://api.primetric.com/beta/employees?name=${name}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const employeeData = (await response.json()) as EmployeeResult;
  const employeeId = employeeData?.results?.[0]?.uuid;

  if (!employeeId) {
    throw new Error("No employee found");
  }

  const assignmentsResponse = await fetch(`https://api.primetric.com/beta/assignments?employee_id=${employeeId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!assignmentsResponse.ok) {
    throw new Error(assignmentsResponse.statusText);
  }
  const data = (await assignmentsResponse.json()) as AssignmentsResult;
  const billableAssignments = data.results
    .filter((result) => result.billable)
    .sort((a: AssignmentResult, b: AssignmentResult) => {
      return compareDesc(new Date(a.ends_at), new Date(b.ends_at));
    });

  const promises = billableAssignments.map(async (assignment) => {
    const projectResponse = await fetch(`https://api.primetric.com/beta/projects/${assignment.project_id}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
      },
    });
    const project = (await projectResponse?.json()) as ProjectResult;
    return {
      id: assignment.uuid,
      startsAt: new Date(assignment.starts_at).toLocaleDateString(),
      endsAt: new Date(assignment.ends_at).toLocaleDateString(),
      label: assignment.label,
      billable: assignment.billable,
      projectName: project.title,
      isCurrent: inFuture(new Date(assignment.ends_at)),
    };
  });

  const projects = await Promise.all(promises);
  return projects;
}
