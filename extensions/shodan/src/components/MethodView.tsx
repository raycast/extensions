// src/components/MethodView.tsx
import { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast, Detail } from "@raycast/api";
import * as ShodanAPI from "../api";
import { validateIP, validateDomain, validateEmail, validatePort } from "../utils/validation";
import { HostInformationView, HostInformation } from "./HostInformationView";
import { addToHistory } from "../utils/history";

function isHostInformation(data: unknown): data is HostInformation {
  return (
    typeof data === "object" &&
    data !== null &&
    "ip_str" in data &&
    "hostnames" in data &&
    "domains" in data &&
    "country_name" in data &&
    "org" in data &&
    "os" in data &&
    "ports" in data
  );
}

export function MethodView({ method }: { method: ShodanAPI.Method | ShodanAPI.PaginatedMethod }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const validateForm = (values: Record<string, string>): boolean => {
    const newErrors: Record<string, string> = {};

    if (method.name === "Host Information" && !validateIP(values.ip)) {
      newErrors.ip = "Invalid IP address";
    }

    if (method.name === "Domain Info" && !validateDomain(values.domain)) {
      newErrors.domain = "Invalid domain name";
    }

    if (method.name === "Add Organization Member" && !validateEmail(values.user)) {
      newErrors.user = "Invalid email address";
    }

    if (method.name === "Scan Internet" && !validatePort(values.port)) {
      newErrors.port = "Invalid port number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const executeMethod = async (values: Record<string, string>) => {
    if (!validateForm(values)) {
      showToast(Toast.Style.Failure, "Invalid input", "Please correct the errors and try again");
      return;
    }

    setIsLoading(true);
    try {
      const paginatedMethod = method as ShodanAPI.PaginatedMethod;
      const params = paginatedMethod.paginate ? { ...values, page: page.toString() } : values;
      const response = await method.execute(params);
      setResult(response);
      await addToHistory(method.name, params);
      showToast(Toast.Style.Success, "Method executed successfully");
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Failed to execute method", error.message);
      } else {
        showToast(Toast.Style.Failure, "Failed to execute method", "An unknown error occurred");
      }
    }
    setIsLoading(false);
  };

  const handleNextPage = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    executeMethod({ page: nextPage.toString() });
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
      executeMethod({ page: prevPage.toString() });
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (method.name === "Host Information" && isHostInformation(result)) {
      return <HostInformationView data={result} />;
    }

    const resultString = JSON.stringify(result, null, 2);
    return (
      <Detail
        markdown={`## Result\n\`\`\`json\n${resultString}\n\`\`\``}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Method" text={method.name} />
            <Detail.Metadata.Label title="Category" text={method.category} />
            {(method as ShodanAPI.PaginatedMethod).paginate && (
              <Detail.Metadata.Label title="Page" text={page.toString()} />
            )}
          </Detail.Metadata>
        }
      />
    );
  };

  if (result) {
    return renderResult();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Execute" onSubmit={executeMethod} />
          {(method as ShodanAPI.PaginatedMethod).paginate && (
            <>
              <Action title="Next Page" onAction={handleNextPage} />
              {page > 1 && <Action title="Previous Page" onAction={handlePreviousPage} />}
            </>
          )}
        </ActionPanel>
      }
    >
      {method.name === "Host Information" && (
        <Form.TextField id="ip" title="IP Address" placeholder="Enter IP address" error={errors.ip} />
      )}

      {method.name === "Domain Info" && (
        <Form.TextField id="domain" title="Domain" placeholder="Enter domain name" error={errors.domain} />
      )}

      {method.name === "Add Organization Member" && (
        <Form.TextField id="user" title="User" placeholder="Enter email address" error={errors.user} />
      )}

      {method.name === "Scan Internet" && (
        <Form.TextField id="port" title="Port" placeholder="Enter port number" error={errors.port} />
      )}

      {method.name === "Search Shodan" && <Form.TextField id="query" title="Query" placeholder="Enter search query" />}

      {method.name === "List Dataset Files" && (
        <Form.TextField id="dataset" title="Dataset" placeholder="Enter dataset name" />
      )}

      {method.name === "DNS Lookup" && (
        <Form.TextField id="hostnames" title="Hostnames" placeholder="Enter comma-separated hostnames" />
      )}

      {method.name === "Reverse DNS Lookup" && (
        <Form.TextField id="ips" title="IP Addresses" placeholder="Enter comma-separated IP addresses" />
      )}

      {(method as ShodanAPI.PaginatedMethod).paginate && (
        <Form.Description title="Page" text={`Current page: ${page}`} />
      )}
    </Form>
  );
}
