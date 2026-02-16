import { Form, ActionPanel, Action, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

type Values = {
  drug: string;
  source: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    const { drug, source } = values;

    if (!drug) {
      await showToast({ style: Toast.Style.Failure, title: "Please enter a search term" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking BNF..." });
    // 1. Determine website
    const baseDomain = source === "bnfc" ? "bnfc.nice.org.uk" : "bnf.nice.org.uk";

    // Clean the slug: lowercase, replace spaces with dashes, remove special characters
    const cleanTerm = drug
      .trim()
      .toLowerCase()
      .replace(/[.,()]/g, "")
      .replace(/\s+/g, "-");

    const drugUrl = `https://${baseDomain}/drugs/${cleanTerm}/`;
    const treatmentUrl = `https://${baseDomain}/treatment-summaries/${cleanTerm}/`;
    const searchUrl = `https://${baseDomain}/search?q=${encodeURIComponent(drug)}`;

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36",
    };

    try {
      // 1. Check if it's a Drug Monograph and open if yes
      const drugRes = await fetch(drugUrl, { method: "HEAD", headers });
      if (drugRes.ok && !drugRes.url.includes("search")) {
        await open(drugUrl);
        toast.style = Toast.Style.Success;
        toast.title = "Opening Drug Page";
        return;
      }

      // 2.  Check if it's a Treatment Summary and open if yes
      const treatRes = await fetch(treatmentUrl, { method: "HEAD", headers });
      if (treatRes.ok && !treatRes.url.includes("search")) {
        await open(treatmentUrl);
        toast.style = Toast.Style.Success;
        toast.title = "Opening Treatment Summary";
        return;
      }

      // 3. Fallback: Open the Search Results
      await open(searchUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Opening Search Results";
    } catch (error) {
      // Emergency fallback if network fails
      await open(searchUrl);
      await showFailureToast(error, { title: "Error checking links, opening search" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search BNF" onSubmit={handleSubmit} />
          {/* Medusa Shortcut explicitly set to Cmd + M */}
          <Action.OpenInBrowser
            title="Open Medusa (Log in Required)"
            url="https://imgmedusa.nhs.uk/search"
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="source" title="Source" defaultValue="bnf">
        <Form.Dropdown.Item value="bnf" title="BNF (Adults)" icon="💊" />
        <Form.Dropdown.Item value="bnfc" title="BNFC (Children)" icon="🧸" />
      </Form.Dropdown>

      <Form.TextField id="drug" title="Drug or Condition" placeholder="e.g. Cefalexin or Hypertension" autoFocus />
    </Form>
  );
}
