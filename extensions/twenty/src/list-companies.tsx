import React from "react";
import { List, Image, Icon, ActionPanel, Action, Toast, showToast, useNavigation } from "@raycast/api";
import { useGetCompanies } from "./hooks/use-company";
import CreatePersonForm from "./create-people";

export default function ListCompanies() {
  const { push } = useNavigation();
  const { companies, isLoading, error, revalidate } = useGetCompanies();

  React.useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load companies",
        message: error.message,
      });
    }
  }, [error]);

  const formatCurrency = (amount: number, currencyCode: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 0,
      }).format(amount / 1000000);
    } catch (error) {
      console.warn(`Invalid currency code: ${currencyCode}. Falling back to simple format.`);
      return `${currencyCode} ${(amount / 1000000).toFixed(0)}`;
    }
  };

  return (
    <List isLoading={isLoading} isShowingDetail>
      {companies.map((company) => {
        const revenue = company.annualRecurringRevenue.amountMicros ?? 0;
        const formattedRevenue = formatCurrency(revenue, company.annualRecurringRevenue.currencyCode ?? "");

        return (
          <List.Item
            key={company.id}
            id={company.id}
            title={company.name}
            subtitle="Company"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Company Name"
                  content={company.name}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Company"
                  onAction={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Company deleted",
                      message: `${company.name} has been removed.`,
                    });
                    revalidate();
                  }}
                />
                <Action
                  icon={Icon.AddPerson}
                  title="Add People"
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  onAction={() => {
                    push(<CreatePersonForm />);
                  }}
                />
                {/* <Action */}
                {/*   icon={Icon.Pencil} */}
                {/*   title="Edit Company" */}
                {/*   shortcut={{ modifiers: ["cmd"], key: "u" }} */}
                {/*   onAction={() => { */}
                {/*     push(<UpdateCompanyForm companyId={company.id} />); */}
                {/*   }} */}
                {/* /> */}
              </ActionPanel>
            }
            icon={{
              source: `https://api.dicebear.com/9.x/initials/svg?seed=${company.name.at(0)}&backgroundColor=1a1b1c&translateX=-20&translateY=20`,
              mask: Image.Mask.RoundedRectangle,
            }}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Name" text={company.name} />
                    <List.Item.Detail.Metadata.Label title="Employees" text={company.employees.toString()} />
                    <List.Item.Detail.Metadata.Label title="Annual Revenue" text={formattedRevenue} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Address" />
                    <List.Item.Detail.Metadata.Label
                      title="Street Address 1"
                      text={company.address.addressStreet1 || "N/A"}
                    />
                    {company.address.addressStreet2 && (
                      <List.Item.Detail.Metadata.Label title="Street Address 2" text={company.address.addressStreet2} />
                    )}
                    <List.Item.Detail.Metadata.Label
                      title="Adress City"
                      text={`${company.address.addressCity || ""}, ${company.address.addressState || ""} ${company.address.addressPostcode || ""}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Address Country"
                      text={company.address.addressCountry || "N/A"}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Key People" />
                    {company.people.map((person, index) => (
                      <List.Item.Detail.Metadata.Label
                        key={index}
                        title={`${person.name.firstName} ${person.name.lastName}`}
                        text={`${person.jobTitle} - ${person.emails.primaryEmail}`}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
