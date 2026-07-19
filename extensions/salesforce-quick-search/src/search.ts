import {
  getPreferenceValues,
  open,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";

interface Preferences {
  instanceDomain: string;
}

export default async function main(
  props: LaunchProps<{ arguments: Arguments.Search }>,
) {
  const { instanceDomain } = getPreferenceValues<Preferences>();
  const domain = instanceDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");

  if (!domain) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Salesforce instance domain is not set",
      message: "Set it in the command preferences.",
    });
    return;
  }

  const query = props.arguments.query?.trim();

  if (!query) {
    await open(`https://${domain}/lightning/page/home`);
    return;
  }

  const payload = {
    componentDef: "forceSearch:searchPageDesktop",
    attributes: {
      values: {
        term: query,
        scopeMap: { type: "TOP_RESULTS" },
        context: {
          disableSpellCorrection: false,
          SEARCH_ACTIVITY: { term: query },
        },
      },
    },
    state: {},
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64",
  );
  await open(`https://${domain}/one/one.app#${encoded}`);
}
