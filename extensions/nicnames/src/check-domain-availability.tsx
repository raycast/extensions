import { Detail, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DomainAvailability } from "./types";
import { callApi } from "./nicnames";

export default function CheckDomainAvailability(props: LaunchProps<{ arguments: Arguments.CheckDomainAvailability }>) {
  const { domain } = props.arguments;
  const { isLoading, data, error } = useCachedPromise(
    async (domain: string) => {
      const result = await callApi<DomainAvailability>(`domain/${domain}/check`);
      return result;
    },
    [domain],
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={`# ${domain}

${
  isLoading
    ? "Checking availability..."
    : error
      ? error.message
      : !data
        ? ""
        : `| Operation | Price | Period |
| --------- | ----- | ------ |
${data.price.map((price) => `| ${price.op} | ${price.amt} | ${price.period.value} ${price.period.unit} |`).join("\n")}`
}`}
    />
  );
}
