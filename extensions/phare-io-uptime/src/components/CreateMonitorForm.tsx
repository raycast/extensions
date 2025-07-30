import { Form } from "@raycast/api";
import { FORM_OPTIONS } from "../constants";

interface CreateMonitorFormProps {
  itemProps: {
    name: Record<string, unknown>;
    url: Record<string, unknown>;
    method: Record<string, unknown>;
    interval: Record<string, unknown>;
    timeout: Record<string, unknown>;
    regions: Record<string, unknown>;
    incidentConfirmations: Record<string, unknown>;
    recoveryConfirmations: Record<string, unknown>;
    statusCodeAssertion: Record<string, unknown>;
    keyword: Record<string, unknown>;
    userAgentSecret: Record<string, unknown>;
    followRedirects: Record<string, unknown>;
    tlsSkipVerify: Record<string, unknown>;
  };
}

export function CreateMonitorForm({ itemProps }: CreateMonitorFormProps) {
  return (
    <>
      <Form.TextField
        id="name"
        title="Monitor Name"
        placeholder="My Website Monitor"
        {...itemProps.name}
      />

      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com"
        {...itemProps.url}
      />

      <Form.Dropdown id="method" title="HTTP Method" {...itemProps.method}>
        {FORM_OPTIONS.methods.map((method) => (
          <Form.Dropdown.Item
            key={method.value}
            value={method.value}
            title={method.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="interval"
        title="Check Interval"
        {...itemProps.interval}
      >
        {FORM_OPTIONS.intervals.map((interval) => (
          <Form.Dropdown.Item
            key={interval.value}
            value={interval.value}
            title={interval.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="timeout"
        title="Timeout (seconds)"
        {...itemProps.timeout}
      >
        {FORM_OPTIONS.timeouts.map((timeout) => (
          <Form.Dropdown.Item
            key={timeout.value}
            value={timeout.value}
            title={timeout.title}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="regions"
        title="Regions"
        info="Select one or more regions to monitor from"
        {...itemProps.regions}
      >
        {FORM_OPTIONS.regions.map((region) => (
          <Form.TagPicker.Item
            key={region.value}
            value={region.value}
            title={region.title}
          />
        ))}
      </Form.TagPicker>

      <Form.Dropdown
        id="incidentConfirmations"
        title="Incident Confirmations"
        {...itemProps.incidentConfirmations}
      >
        {FORM_OPTIONS.confirmations.map((confirmation) => (
          <Form.Dropdown.Item
            key={confirmation.value}
            value={confirmation.value}
            title={confirmation.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="recoveryConfirmations"
        title="Recovery Confirmations"
        {...itemProps.recoveryConfirmations}
      >
        {FORM_OPTIONS.confirmations.map((confirmation) => (
          <Form.Dropdown.Item
            key={confirmation.value}
            value={confirmation.value}
            title={confirmation.title}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="statusCodeAssertion"
        title="Status Code Assertion"
        placeholder="2xx,30x,418"
        info="Comma-separated status codes to consider as success"
        {...itemProps.statusCodeAssertion}
      />

      <Form.TextField
        id="keyword"
        title="Keyword Check"
        placeholder="pong"
        info="Optional keyword to search for in response body"
        {...itemProps.keyword}
      />

      <Form.TextField
        id="userAgentSecret"
        title="User Agent Secret"
        placeholder="definitely-not-a-bot"
        info="Optional custom user agent string"
        {...itemProps.userAgentSecret}
      />

      <Form.Checkbox
        id="followRedirects"
        title="Follow Redirects"
        label="Follow Redirects"
        {...itemProps.followRedirects}
      />

      <Form.Checkbox
        id="tlsSkipVerify"
        title="Skip TLS Verification"
        label="Skip TLS Verification"
        {...itemProps.tlsSkipVerify}
      />
    </>
  );
}
