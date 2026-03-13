import { getFrontmostApplication, showToast, Toast, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

// CAUTION: This will be inserted into the user's browser!
const OUTLINING_JAVASCRIPT = `javascript: void (function () {
  var style = document.getElementById('raycast-outline-page');
  if (style) {
    return style.parentNode.removeChild(style);
  }
  var colors =
    '2980b9-3498db-0088c3-33a0ce-66b8da-99cfe7-cce7f3-162544-314e6e-3e5e85-449baf-c7d1cb-4371d0-2f4f90-1a2c51-036cdb-ac050b-ff063f-850440-f1b8e7-ff050c-d90416-d90416-fd3427-ff0043-e80174-f0b-bf0032-0c9-37ffc4-98daca-64a7a0-22746b-86c0b2-a1e7d6-3f5a54-6c9a8f-6c9a9d-da8301-c06000-d95100-d23600-fca600-b31e00-ee8900-de6d00-e8630c-b33600-ff8a00-ff9619-e57c00-e26e0f-cc5400-33848f-60a1a6-438da1-449da6-bf0000-400000-22746b-64a7a0-98daca-0c9-37ffc4-6ee866-027353-012426-a2f570-59a600-7be500-305900-ff62ab-800b41-ff1583-803156-cc1169-ff0430-f805e3-d107b2-4a0263-240018-64003c-b4005a-dba0c8-cc0256-d6606d-e04251-5e001f-9c0033-d90047-ff0053-bf3668-6f1400-ff7b93-ff2f54-803e49-cc2643-db687d-db175b';
  var selectors =
    'body0article0nav0aside0section0header0footer0h10h20h30h40h50h60main0address0div0p0hr0pre0blockquote0ol0ul0li0dl0dt0dd0figure0figcaption0table0caption0thead0tbody0tfoot0tr0th0td0col0colgroup0button0datalist0fieldset0form0input0keygen0label0legend0meter0optgroup0option0output0progress0select0textarea0details0summary0command0menu0del0ins0img0iframe0embed0object0param0video0audio0source0canvas0track0map0area0a0em0strong0i0b0u0s0small0abbr0q0cite0dfn0sub0sup0time0code0kbd0samp0var0mark0bdi0bdo0ruby0rt0rp0span0br0wbr';
  var rule = '{{selector}} { outline:1px solid {{color}} !important }';
  var CSS = selectors
    .split(0)
    .reduce(function (prev, curr, idx, arr) {
      prev[idx] = curr + '{outline:1px solid #' + prev[idx] + ' !important}';
      return prev;
    }, colors.split('-'))
    .join('');
  var style = document.createElement('style');
  style.id = 'raycast-outline-page';
  style.textContent = CSS;
  document.getElementsByTagName('head')[0].appendChild(style);
})()`;

export default async function runOutlinePage() {
  // Close the main window
  await closeMainWindow();

  // Show a toast notification while running the script
  await showToast({
    style: Toast.Style.Animated,
    title: "Running Outline Page...",
  });

  // Get the name of the frontmost application
  const frontAppName = (await getFrontmostApplication()).name;

  try {
    // Check the frontmost application and run the AppleScript accordingly
    if (frontAppName === "Safari") {
      await runAppleScript(`tell application "Safari" to do JavaScript "${OUTLINING_JAVASCRIPT}" in document 1`);
    } else {
      await runAppleScript(
        `tell application "${frontAppName}"
          execute front window's active tab javascript "${OUTLINING_JAVASCRIPT}"
        end tell`,
      );
    }

    // Show a success toast
    await showToast({ title: `Added/Removed Outline in ${frontAppName}` });
  } catch (error) {
    let errorMessage = "";

    // Handle specific error messages for different applications
    if (frontAppName === "Safari") {
      errorMessage = "Enable the 'Allow JavaScript from Apple Events' option in Safari's Develop menu.";
    } else if (frontAppName === "Google Chrome" || frontAppName === "Brave Browser") {
      errorMessage = "Enable the 'Allow JavaScript from Apple Events' option from the menu bar item: View > Developer.";
    } else {
      errorMessage = `Could not run Outline Page in ${frontAppName}. Make sure the frontmost app is Safari or Chrome.`;
    }

    // Show a failure toast with the error message
    showToast({
      style: Toast.Style.Failure,
      title: errorMessage,
    });
  }
}
