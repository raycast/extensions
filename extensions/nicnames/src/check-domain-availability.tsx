import { Detail, LaunchProps } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { checkDomainAvailability } from "./nicnames";

export default function CheckDomainAvailability(props: LaunchProps<{ arguments: Arguments.CheckDomainAvailability }>) {
  const { domain } = props.arguments;
  const { isLoading, data, error } = useCachedPromise(checkDomainAvailability, [domain]);

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
