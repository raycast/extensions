import {
  Form,
  Action,
  ActionPanel,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { PiHoleQueryResult } from "./types/pihole";
import { getPiHoleAPI } from "./utils/api-singleton";

interface QueryFormValues {
  domain: string;
}

function QueryResult({ result }: { result: PiHoleQueryResult }) {
  const formatLastSeen = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push
            title="Query Another Domain"
            target={<QueryDomainForm />}
            icon={Icon.MagnifyingGlass}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Query result for: ${result.domain}`} />
      <Form.Separator />

      <Form.Description text={`Status: ${result.status}`} />
      <Form.Description text={`Details: ${result.reason}`} />

      {result.type && <Form.Description text={`Query Type: ${result.type}`} />}

      <Form.Description
        text={`Last Query: ${formatLastSeen(result.lastSeen)}`}
      />
      <Form.Description
        text={`Total Queries: ${result.queryCount.toLocaleString()}`}
      />
    </Form>
  );
}

function QueryDomainForm() {
  const { push } = useNavigation();
  const api = getPiHoleAPI();

  const handleSubmit = async (values: QueryFormValues) => {
    const { domain } = values;

    if (!domain.trim()) {
      showFailureToast("Please enter a domain to query", {
        title: "Invalid Domain",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Querying Domain...",
        message: `Checking ${domain}`,
      });

      const result = await api.queryDomain(domain.trim());

      await showToast({
        style: Toast.Style.Success,
        title: "Query Complete",
        message: `${domain} is ${result.status}`,
      });

      push(<QueryResult result={result} />);
    } catch (error) {
      showFailureToast(error, { title: "Query Failed" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Query Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        info="Enter a domain to check if it's blocked by Pi-hole"
      />
    </Form>
  );
}

export default function QueryDomainCommand() {
  return <QueryDomainForm />;
}
