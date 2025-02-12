import { Form } from "@raycast/api";

const AdvanceOptions = () => {
  return (
    <>
      <Form.Separator />
      <Form.Checkbox id="crawler" label="Fetch original content" />
      <Form.Checkbox id="fetch_via_proxy" label="Fetch via Proxy" />
      <Form.Checkbox id="ignore_http_cache" label="Ignore HTTP cache" />
      <Form.Checkbox id="disable" label="Disable" />
      <Form.TextField
        id="user_agent"
        title="Override Default User Agent"
        placeholder="Custom user agent for the feed"
      />
      <Form.TextField id="username" title="Feed Username" />
      <Form.PasswordField id="password" title="Feed Password" />
      <Form.TextField id="scraper_rules" title="Scraper Rules" placeholder="List of scraper rules" />
      <Form.TextField id="rewrite_rules" title="Rewrite Rules" placeholder="List of rewrite rules" />
      <Form.TextField id="blocklist_rules" title="Block Rules" />
      <Form.TextField id="keeplist_rules" title="Keep Rules" />
    </>
  );
};

export default AdvanceOptions;
