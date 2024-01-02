import { getNewIssueUrl } from "./get-new-issue-url";

function getBody(errorDescription: string): string {
  return `
<!--
Please+update+the+title+above+to+consisely+describe+the+issue
-->

###+Extension

https://raycast.com/#{extension_path(extension)}

###+Description

<!--
Please+provide+a+clear+and+concise+description+of+what+the+bug+is.+Include+screenshots+if+needed.+Please+test+using+the+latest+version+of+the+extension,+Raycast+and+API.
-->

###+Steps+To+Reproduce

<!--
Your+bug+will+get+fixed+much+faster+if+the+extension+author+can+easily+reproduce+it.+Issues+without+reproduction+steps+may+be+immediately+closed+as+not+actionable.
-->

${errorDescription.replaceAll(" ", "+")}

###+Current+Behavior

###+Expected+Behavior

`;
}

function getApiErrorIssueUrl(reason: string): URL {
  const title = `[Popicons]+API+Error:+${reason}`;
  const body = getBody(`Loading Popicons from the API failed with the following error: ${reason}`);

  return getNewIssueUrl({ title, body });
}

export { getApiErrorIssueUrl };
