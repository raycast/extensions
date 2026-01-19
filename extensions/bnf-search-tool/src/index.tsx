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
      await showToast({ style: Toast.Style.Failure, title: "Please enter a medication" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking BNF..." });

    // 1. Determine website
    const baseDomain = source === "bnfc" ? "bnfc.nice.org.uk" : "bnf.nice.org.uk";

    // 2. Format the slug (lowercase, spaces to dashes)
    const slug = drug.trim().toLowerCase().replace(/\s+/g, "-");

    const directUrl = `https://${baseDomain}/drugs/${slug}/`;
    const searchUrl = `https://${baseDomain}/search?q=${encodeURIComponent(drug)}`;

    try {
      // 3. Check if page exists
      // We send a User-Agent header to ensure the request is treated as a standard browser request.
      const response = await fetch(directUrl, {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36",
        },
      });

      if (response.ok) {
        await open(directUrl);
        toast.style = Toast.Style.Success;
        toast.title = "Opening Drug Page";
      } else {
        await open(searchUrl);
        toast.style = Toast.Style.Success;
        toast.title = "Opening Search Results";
      }
    } catch (error) {
      // If the internet is down or something else breaks, safe fallback to search
      await open(searchUrl);

      // Simplify error handling using Raycast's utility
      await showFailureToast(error, { title: "Error checking link, opening search" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search BNF" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="source" title="Source" defaultValue="bnf">
        <Form.Dropdown.Item value="bnf" title="BNF (Adults)" icon="💊" />
        <Form.Dropdown.Item value="bnfc" title="BNFC (Children)" icon="🧸" />
      </Form.Dropdown>

      <Form.TextField id="drug" title="Medication" placeholder="e.g. Paracetamol" autoFocus />
    </Form>
  );
}
