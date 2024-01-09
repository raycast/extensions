const NEW_ISSUE_URL = new URL("https://github.com/raycast/extensions/issues/new");

const DEFAULT_TITLE = "[Popicons]+...";
const DEFAULT_TEMPLATE = "extension_bug_report.yml";
const DEFAULT_LABELS = "extension,bug";
const DEFAULT_EXTENSION_URL = "https://www.raycast.com/lucaschultz/popicons";
const DEFAULT_BODY = `
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

1.+In+this+environment...
2.+With+this+config...
3.+Run+'...'
4.+See+error...

###+Current+Behavior

###+Expected+Behavior

`;

const DEFAULT_PARAMS = {
  title: DEFAULT_TITLE,
  template: DEFAULT_TEMPLATE,
  labels: DEFAULT_LABELS,
  "extension-url": DEFAULT_EXTENSION_URL,
  body: DEFAULT_BODY,
} as const;

type NewIssueParams = {
  [key in keyof typeof DEFAULT_PARAMS]?: string;
};

function getNewIssueUrl(params?: NewIssueParams) {
  for (const [key, value] of Object.entries(params ?? {})) {
    NEW_ISSUE_URL.searchParams.set(
      key,
      value?.replaceAll(" ", "+") ?? DEFAULT_PARAMS[key as keyof typeof DEFAULT_PARAMS]
    );
  }

  return NEW_ISSUE_URL;
}

export { getNewIssueUrl };
