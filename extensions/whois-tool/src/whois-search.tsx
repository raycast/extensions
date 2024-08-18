import { Detail, Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { exec } from "child_process";

export default function Command() {
  const { push } = useNavigation();
  const [domain, setDomain] = useState<string>("");

  const handleSubmit = (values: { domain: string }) => {
    const domain = values.domain;
    push(<WhoisDetail domain={domain} />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get WHOIS Info" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="Enter domain (example.com)"
        value={domain}
        onChange={setDomain}
      />
    </Form>
  );
}

function WhoisDetail({ domain }: { domain: string }) {
  const [whoisData, setWhoisData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    exec(`whois ${domain}`, (error, stdout, stderr) => {
      if (error || stderr) {
        setWhoisData(`Error: Could not retrieve WHOIS data for ${domain}`);
      } else {
        setWhoisData(stdout);
      }
      setLoading(false);
    });
  }, [domain]);

  if (loading) {
    return <Detail markdown={`# 🔍 Loading WHOIS data for ${domain}...`} />;
  }

  return (
    <Detail
      markdown={`# 🌎 WHOIS Information for ${domain}\n\`\`\`\n${whoisData}\n\`\`\``}
    />
  );
}
