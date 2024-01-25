const NEW_ISSUE_URL = new URL(
  "https://github.com/raycast/extensions/issues/new?title=%5BPopicons%5D+...&template=extension_bug_report.yml&labels=extension%2Cbug&extension-url=https%3A%2F%2Fwww.raycast.com%2Flucaschultz%2Fpopicons&body=%0A%3C%21--%0APlease+update+the+title+above+to+consisely+describe+the+issue%0A--%3E%0A%0A%23%23%23+Extension%0A%0Ahttps%3A%2F%2Fraycast.com%2F%23%7Bextension_path%28extension%29%7D%0A%0A%23%23%23+Description%0A%0A%3C%21--%0APlease+provide+a+clear+and+concise+description+of+what+the+bug+is.+Include+screenshots+if+needed.+Please+test+using+the+latest+version+of+the+extension%2C+Raycast+and+API.%0A--%3E%0A%0A%23%23%23+Steps+To+Reproduce%0A%0A%3C%21--%0AYour+bug+will+get+fixed+much+faster+if+the+extension+author+can+easily+reproduce+it.+Issues+without+reproduction+steps+may+be+immediately+closed+as+not+actionable.%0A--%3E%0A%0A1.+In+this+environment...%0A2.+With+this+config...%0A3.+Run+%27...%27%0A4.+See+error...%0A%0A%23%23%23+Current+Behavior%0A%0A%23%23%23+Expected+Behavior%0A%0A"
);

function getNewIssueUrl() {
  return NEW_ISSUE_URL;
}

export { getNewIssueUrl };
